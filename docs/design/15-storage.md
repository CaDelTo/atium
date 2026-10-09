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
