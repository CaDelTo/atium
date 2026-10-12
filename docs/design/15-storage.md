# Storage

> Parte del documento de diseño de Atium. Índice: [README](README.md)

## 23. Storage

### 23.1 Problema

Los runners de CI son efímeros y varios jobs escriben a la vez (shards, PRs paralelos). El storage tiene que persistir entre ejecuciones y no puede depender de locks.

### 23.2 Diseño: archivos inmutables + compactación

```
<bucket>/<prefix>/v1/
├── runs/2026/10/09/<runId>.ndjson.gz     un archivo por run o shard, nunca se modifica
├── snapshots/<snapshotId>.sqlite.gz      historial compactado
├── stats/<snapshotId>.json.gz            agregados por test para CI
└── latest.json                           puntero al último snapshot (se escribe al final)
```

- **Escritura:** cada job sube su propio archivo con un nombre único. Sin conflictos ni locks.
- **Lectura en CI:** descarga `stats` del último snapshot + archivos de runs posteriores al snapshot.
- **Compactación** (`atium compact`): fusiona runs, aplica retención, calcula agregados y evidencia de flakiness, escribe un snapshot nuevo y al final actualiza `latest.json`. Es idempotente: si dos compactaciones corren a la vez, ambas producen snapshots válidos y gana el último puntero.
- Se ejecuta en un job nocturno o, si no hay ninguno, oportunistamente desde `atium upload` cuando el último snapshot tiene más de 24 h.

#### 23.2.1 Archivos de run locales

El formato, los topes y los límites están en [ADR-0018](../adr/0018-formato-archivos-run.md); aquí solo se describe cómo los aplica `@atium/core` (`writeRunFile`, `readRunFile` y `readRunFileEntries`).

- **Ruta:** `.atium/runs/<runId>.ndjson.gz`, relativa a la raíz del repo (`RUNS_DIRECTORY`). Los backends remotos usan el layout de 23.2.
- **Escritura atómica** (ADR-0018):
  - El archivo se escribe en un directorio temporal `.tmp-*` dentro de `.atium/runs/` y se publica con `rename`.
  - `rename` reemplaza en silencio un archivo existente, así que antes se comprueba el nombre: un `runId` repetido da `STORAGE_CONFLICT` y el archivo existente queda intacto (ADR-0007). Con `runId` uuid v7 no se espera que dos escrituras compitan entre la comprobación y el `rename`.
  - Si la escritura falla, no se publica ningún archivo.
  - Después se borra el directorio temporal. Si no se puede borrar, se registra un aviso en el `logger` y la escritura no cambia de resultado. Si el proceso muere a mitad, puede quedar un `.tmp-*`: quien liste `.atium/runs/` debe ignorarlo.
  - El archivo se crea con permisos `0600` (solo su dueño), porque contiene mensajes de error, stacks y llamadas de red. En Windows el modo se ignora.
  - El escritor no redacta: recibe los textos ya redactados ([20-security-privacy.md §28.1](20-security-privacy.md)).
- **Preparación de cada línea**, en este orden:
  1. Elimina los códigos ANSI (`util.stripVTControlCharacters` de Node).
  2. Aplica los topes de listas y de textos.
  3. Valida con Zod.
  4. Aplica la garantía final de 768 KiB.

  Los campos con formato (`id`, `testId`, `fingerprint` y las fechas) no se truncan, porque truncarlos los volvería inválidos: un valor inválido da `MODEL_INVALID` sin publicar el archivo. Los identificadores de texto libre (`commitSha`, `ci.runId`, `ci.jobId`) sí se truncan a 2 KiB como cualquier otro string; ningún valor real llega a ese tamaño.
- **Garantía final:** si después del paso 5 la línea sigue por encima del límite del lector (1 MiB), el escritor falla con un `Error` de bug en lugar de escribir una línea que el lector rechazaría. Con el modelo actual no puede ocurrir; indica que se añadió un campo sin revisar la cota de ADR-0018.
- **Casos que el ADR no fija:**
  - Muestras de consola por encima de 5: se conservan las 5 últimas, sin conteo, porque son las más cercanas al fallo.
  - Garantía final, pasos 2 y 3: `callsDropped` desaparece con `calls`, y `pageErrorsDropped` con `pageErrors`, porque los conteos solo describen lo que descartan los topes. `console.samples` queda como `[]`. El paso 4 no cambia `stepsDropped`.
  - Si la entrada ya trae conteos `*Dropped`, se les suma lo que se descarta. `detailTruncated: true` se conserva. Así, reescribir un run leído no lo cambia.
  - Las claves de `statuses` que quedan iguales al truncarlas suman sus conteos.
- **Lectura:**
  - Divide las líneas sobre los bytes descomprimidos y comprueba cada límite antes de juntar la línea.
  - Decodifica UTF-8 en modo estricto.
  - Lee `schemaVersion` antes de validar el encabezado.
  - Acepta una última línea sin `\n` y rechaza las líneas vacías intermedias.
- **Errores de lectura:**
  - Archivo ilegible: `STORAGE_UNAVAILABLE`.
  - Gzip, UTF-8, JSON o esquema inválidos, un límite superado, un `schemaVersion` no soportado o un archivo vacío: `MODEL_INVALID`, con el número de línea cuando aplica.
  - El mensaje muestra como mucho los 5 primeros problemas de Zod (`ZOD_ISSUES_SHOWN`), con la ruta y el texto escapados y recortados, porque una ruta puede contener una clave del archivo.
  - Ni el `ZodError` ni el error de `JSON.parse` van como `cause`: el primero lista todos los problemas y el segundo cita parte de la línea, y los loggers imprimen la causa. Los errores de E/S y de gzip sí van como `cause`.

### 23.3 Niveles de datos y retención

| Nivel | Contenido | Retención por defecto |
|---|---|---|
| Raw | Runs completos (intentos, errores, red de intentos fallidos) | 14 días |
| Rollups diarios | Por test y día: runs, intentos, fallos, retry-passes, divergencias en mismo commit, duración p50/p95, top 3 fingerprints | 180 días |
| Stats | Agregados de la ventana de análisis (30 días) por test, más estados de flaky | Solo el último |
| Artefactos (traces, screenshots) | No se suben al storage de Atium; se enlazan desde los artefactos del CI | Lo que defina el CI |

La evidencia que requiere comparar intentos del mismo commit se calcula durante la compactación y queda en los rollups, así que no se pierde al expirar los datos raw.

### 23.4 Estimación de volumen

Para 5,000 tests, 30 runs al día:

| Nivel | Estimación |
|---|---|
| Un run sin fallos | ≈ 1 MB comprimido |
| Raw (14 días) | ≈ 420 MB en el bucket |
| Rollups (180 días) | ≈ 45 MB en el snapshot |
| Stats (descarga en CI) | ≈ 1–2 MB |

Si el volumen crece más allá de esto, DuckDB sobre Parquet es la alternativa considerada para el análisis.

### 23.5 Backends

| Backend | Uso | Notas |
|---|---|---|
| Local (SQLite en `.atium/`) | Desarrollo, default | No persiste en CI |
| S3 y compatibles (MinIO, R2, GCS vía API S3) | CI, recomendado | Credenciales por variables de entorno |
| Rama git huérfana (`atium-data`) | CI sin infraestructura | Mismo layout; push con reintento y rebase (los archivos son únicos, no hay conflictos) |
| Artefactos de CI | Proyectos pequeños | Retención limitada por el proveedor |
| Servidor de ingesta | Multi-repo y dashboard | Futuro |

### 23.6 Esquema SQLite local

| Tabla | Clave / índices | Contenido |
|---|---|---|
| `runs` | `id`; índice `(commit_sha)`, `(branch, started_at)` | Metadatos de git, CI y entorno |
| `test_cases` | `test_id` | Proyecto, archivo, `title_path`, tags, primera y última vez visto |
| `test_aliases` | `(old_test_id, new_test_id)` | Renombres detectados |
| `test_results` | `(run_id, test_id)`; índice `(test_id, started_at)` | Outcome, worker, orden, cuarentena |
| `attempts` | `(run_id, test_id, index)`; índice `(error_fingerprint)` | Estado, duración, error |
| `errors` | `fingerprint` | Tipo, mensaje normalizado, familia, muestra |
| `network_endpoints` | `(run_id, test_id, attempt, method, url_template)` | Resumen por endpoint |
| `network_calls` | `(run_id, test_id, attempt, seq)` | Llamadas de intentos fallidos |
| `daily_rollups` | `(test_id, day)` | Agregados diarios |
| `findings` | `(run_id, fingerprint)` | Findings de cada análisis |
