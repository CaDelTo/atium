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

- **Ruta:** `.atium/runs/<runId>.ndjson.gz`, relativa a la raíz del repo (`RUNS_DIRECTORY`); en el CLI, la raíz es el directorio de trabajo ([18-cli-config.md §26.1](18-cli-config.md#261-comandos)). Los backends remotos usan el layout de 23.2.
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

#### 23.2.2 Interfaces

`@atium/core` define las interfaces; los backends viven en `packages/storage/*` y el fake `InMemoryStorage` en `@atium/core/testing`.

- `StorageReader`: `getRun(id)` y `listRuns({ branch?, since?, limit })`. Es lo único del storage que reciben los analizadores, y solo cuando la capacidad `history` está disponible ([14-architecture.md §22.2](14-architecture.md#222-interfaz-de-analizador), [ADR-0023](../adr/0023-arquitectura-linter.md)).
- `StorageWriter`: `writeRun(run)`.
- `Storage`: los dos lados más `close()`. Solo lo tiene quien abre el storage (el CLI o un reporter), así que quien recibe un lado no puede cerrarlo.
- **Resultados:** las tres operaciones devuelven `Result`.
  - Un run inexistente es `ok(undefined)`, no un error.
  - Un `id` repetido da `STORAGE_CONFLICT` y el run guardado queda intacto (ADR-0007).
  - Un storage inaccesible o ya cerrado da `STORAGE_UNAVAILABLE`.
  - Un backend que valida lo que escribe devuelve `MODEL_INVALID`, sin guardar nada, para un run que no cumple `RunSchema` o que no puede guardar tal cual. Si valida lo que lee, devuelve `MODEL_INVALID` para un run guardado que ya no cumple `RunSchema`. El fake en memoria no valida; SQLite valida en los dos sentidos (§23.6).
- **`listRuns`:**
  - Orden: `startedAt` descendente (el más reciente primero) y, en empate, `id` descendente. Así `limit` devuelve los últimos N runs.
  - `branch`: coincidencia exacta con `git.branch`. Los runs sin rama no coinciden con ningún filtro de rama.
  - `since`: fecha y hora ISO 8601 con `Z` o un offset, inclusiva (`startedAt >= since`). Se compara como instante, no como texto. Una fecha y hora sin zona se rechaza, porque `Date.parse` la leería en la zona horaria de la máquina y el resultado cambiaría entre CI y local.
  - `limit`: obligatorio, entero ≥ 1 y como mucho `Number.MAX_SAFE_INTEGER`.
  - Un `limit` o un `since` inválidos son un bug del llamador: `RangeError`, no `Result`. Se comprueban antes que nada, así que también se lanza con el storage cerrado. Todos los backends usan `parseListRunsQuery` de `@atium/core`, que además devuelve `since` como instante en milisegundos.
- **`close`:** es idempotente. Después de cerrar, toda operación con argumentos válidos devuelve `STORAGE_UNAVAILABLE`.
- **Contrato:** todo backend pasa la suite `packages/core/test-contracts/storage.contract.ts` (`storageContract`, exportada como `@atium/core/test-contracts`), que cubre lo anterior y las escrituras concurrentes: N runs distintos escritos a la vez se leen todos, y de varias escrituras simultáneas del mismo `id` gana exactamente una. La suite usa runs dentro de los topes de ADR-0018, porque un backend de archivos los aplica al escribir.

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

En V0 existen `runs`, `test_cases`, `test_results`, `attempts` y `errors` (`@atium/storage-sqlite`). Las demás tablas llegan con migraciones en sus fases.

- **Apertura** (`openSqliteStorage({ rootDir, path?, logger })`):
  - Base en `.atium/atium.db` (`SQLITE_DATABASE_PATH`) o en `path`, relativo a la raíz del repo o absoluto dentro de ella, resuelto con `resolveInside`. Un `path` fuera de la raíz da `MODEL_INVALID`.
  - Crea los directorios que falten con permisos `0700` (`SQLITE_DIRECTORY_MODE`).
  - Comprueba otra vez la ruta tras resolver los symlinks del directorio con `realpath` (06-security.md). Si un symlink la saca de la raíz, o si el archivo de la base es un symlink, da `MODEL_INVALID`. El archivo se crea con `O_NOFOLLOW` donde existe.
  - Un archivo nuevo se crea con permisos `0600` (`SQLITE_FILE_MODE`), como los archivos de run; SQLite da los mismos a `-wal` y `-shm`. Un archivo existente conserva los suyos.
  - Activa el modo WAL y `foreign_keys`. Si el sistema de archivos no admite WAL, la base se abre igual y se registra un aviso en el `logger`. `busy_timeout`: 5.000 ms (`SQLITE_BUSY_TIMEOUT_MS`), el default de better-sqlite3.
  - Aplica las migraciones pendientes de Drizzle (`packages/storage/sqlite/drizzle/`, generadas con `pnpm --filter @atium/storage-sqlite db:generate`). Dos procesos que abren a la vez una base nueva pueden aplicar la misma migración a la vez; el segundo falla con `STORAGE_UNAVAILABLE` y la siguiente apertura funciona.
  - Si no puede crear, abrir o migrar la base, da `STORAGE_UNAVAILABLE`.
  - `close` no falla: si SQLite no puede cerrar la base, lo registra como aviso en el `logger` (ADR-0006).
- **Principio del esquema:**
  - `test_results` y `attempts` guardan lo que observó cada run, así que `getRun` devuelve el run exactamente como se escribió, aunque los tags, la ubicación o el mensaje de un error cambien entre runs.
  - `test_cases` y `errors` son catálogos derivados de esas filas.
  - Las estructuras anidadas que todavía no tienen tabla propia son columnas JSON: `frameworkConfig`, `titlePath`, tags, `bdd`, `matcher`, `network`, `console`, `pageErrors` y `artifacts`. La red pasará a `network_endpoints` y `network_calls` con su migración.
  - Las fechas conservan su texto ISO original. Las columnas `*_ms` guardan el mismo instante para ordenar y filtrar.
  - Un campo ausente es `NULL` y al leer se omite la clave, no se pone `undefined`.
- **Columnas de V0:**

| Tabla | Clave / índices | Columnas |
|---|---|---|
| `runs` | `id`; `(commit_sha)`, `(branch, started_at_ms, id)`, `(started_at_ms, id)` | `schema_version`; `git` (`commit_sha`, `head_sha`, `branch`, `base_branch`, `dirty`); `ci_*` (`provider`, `run_id`, `run_attempt`, `job_id`, `shard_index`, `shard_total`, `pr_number`; `ci_provider` nulo significa sin `ci`); entorno (`os`, `arch`, `node_version`, `framework_name`, `framework_version`); `framework_config` JSON; `started_at`, `started_at_ms`, `finished_at` |
| `test_cases` | `test_id` | `project`, `file`, `title_path`, `tags`, `first_seen_ms`, `last_seen_ms` |
| `test_results` | `(run_id, test_id)`; `(test_id, started_at_ms)`; `run_id` → `runs` en cascada | `position` (orden en `results`), `started_at_ms` del run, el `TestCase` de ese run (`project`, `file`, `title_path`, `tags`, `location_line`, `location_column`), `outcome`, `attempts_dropped`, `worker_index`, `sequence_in_worker`, `quarantined`, `bdd`, `detail_truncated` (1 o nulo) |
| `attempts` | `(run_id, test_id, attempt_index)`; `(error_fingerprint)`; `(run_id, test_id)` → `test_results` en cascada | `position`, `status`, `started_at`, `duration_ms`, la ocurrencia del error (`error_fingerprint`, `error_family`, `error_type`, `error_message`, `error_stack`, `error_locator`, `error_matcher`, `error_failed_at_ms`), `network`, `console`, `page_errors`, `page_errors_dropped`, `artifacts` |
| `errors` | `fingerprint` | `type`, `family`, `sample_message` |

- **Índices:** la tabla general de arriba no lista `runs (started_at_ms, id)`; ese índice sirve a `listRuns` sin filtro de rama. Los dos índices de `runs` que usa `listRuns` terminan en `id`, para resolver el desempate del orden.
- **Catálogos:**
  - `test_cases` se actualiza con un upsert. `first_seen_ms` y `last_seen_ms` son el mínimo y el máximo de los inicios de run. `project`, `file`, `title_path` y `tags` vienen del run más reciente, aunque se escriba después uno más antiguo. Con dos runs del mismo instante, gana el último escrito.
  - `errors` guarda el tipo, la familia y, como muestra, el mensaje de la primera ocurrencia escrita de cada `fingerprint`. El modelo no tiene un mensaje normalizado; esa columna llegará con su fase.
- **Escritura:**
  - El storage guarda los textos tal como llegan: se redactan antes de `writeRun` ([20-security-privacy.md §28.1](20-security-privacy.md)).
  - Un `writeRun` es una transacción `IMMEDIATE` con sentencias preparadas reutilizadas. Toma el lock de escritura antes de comprobar el `id`, así que dos procesos no pueden encontrarlo libre a la vez.
  - Antes valida el run con `RunSchema`.
  - Un `testId` repetido en un run o un `index` de intento repetido en un resultado chocan con las claves: dan `MODEL_INVALID` sin guardar nada. Pendiente: `atium stress` (`--repeat-each`, [07-flaky.md](07-flaky.md)) produce repeticiones del mismo test en un run; habrá que decidir si el adapter las une o si cambia la clave.
- **Lectura:**
  - Reconstruye el run y lo valida con `RunSchema`.
  - Dan `MODEL_INVALID`:
    - Un JSON que no se puede parsear. El mensaje dice qué run es pero no cita el texto que da `JSON.parse`, que es contenido del run (§23.2.1).
    - Columnas de un mismo campo que no concuerdan: una ocurrencia de error sin una columna obligatoria, solo una de `ci_shard_index` y `ci_shard_total`, solo una de `location_line` y `location_column`, columnas `ci_*` sin `ci_provider`, o un `detail_truncated` distinto de 1.
    - Un run que no cumple el esquema. El mensaje incluye el resumen acotado de `describeIssues`.
  - Los mensajes citan rutas e ids con `quoteForMessage`.
  - Cualquier otro error de SQLite da `STORAGE_UNAVAILABLE` con el error como `cause`.
- **Rendimiento:** escribir un run de 1.000 tests tarda menos de 1 s. El benchmark está en `packages/storage/sqlite/bench/` y también mide un run de 5.000 tests, sin presupuesto.
