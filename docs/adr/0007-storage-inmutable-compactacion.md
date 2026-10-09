# ADR-0007: Storage con archivos inmutables y compactación

- Estado: Aceptada
- Fecha: 2026-10-08
- Diseño relacionado: 15-storage.md

## Contexto

Los runners de CI son efímeros y varios jobs escriben a la vez (shards, PRs paralelos). El historial debe persistir sin locks y sin crecer sin límite.

## Decisión

- Cada job sube su propio archivo de run (`runs/AAAA/MM/DD/<runId>.ndjson.gz`), que nunca se modifica.
- `compact` fusiona runs en snapshots, calcula rollups y evidencia de flakiness, y actualiza `latest.json` al final. Es idempotente.
- Niveles: raw (14 días), rollups diarios (180 días), stats para CI (último).
- Backends: SQLite local, S3 y compatibles, rama git huérfana.

## Consecuencias

- Sin conflictos de escritura.
- La compactación necesita un job nocturno o se ejecuta oportunistamente desde `upload`.

## Alternativas descartadas

- Una base SQLite compartida en el bucket: conflictos de escritura y descargas cada vez más grandes.
- Servidor propio desde el inicio: infraestructura que bloquea la adopción.
