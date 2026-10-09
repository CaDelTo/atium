# Archivos de run (`.ndjson.gz`)

- ID: v0-14-run-files
- Fase: V0
- Paquete: packages/core/src/storage
- Depende de: v0-13

## Contexto

- Diseño: docs/design/15-storage.md §23.2, docs/design/02-data-model.md §9.5
- Estándares: 05-performance.md (streaming), 06-security.md (límites de tamaño), 07-public-api.md (el esquema de archivos de run es público)

## Hacer

- Escritura de un `Run` en `.atium/runs/<runId>.ndjson.gz`, de forma atómica (archivo temporal + rename).
- Lectura en streaming, validando cada línea con Zod.
- Límites de tamaño de línea y de tamaño descomprimido total para evitar archivos maliciosos.
- Lectores que aceptan `schemaVersion` actual y anterior (hoy solo existe la 1).

## Decisiones abiertas en esta tarea

El diseño no define el formato interno de las líneas. Propuesta para el plan: línea 1 = encabezado del run sin `results`; una línea por `TestResult` a continuación. Como es un formato público, la decisión final requiere un ADR (`/adr`). Propón también los valores de los límites de tamaño.

## Criterios de aceptación

- Escribir y leer un run construido con builders devuelve el mismo objeto.
- Un archivo con una línea inválida produce un error con el número de línea.
- Un archivo que supera el límite se rechaza sin cargarse completo en memoria.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes

## Fuera de alcance

- Layout remoto y compactación (V4).
