# Esquemas Zod del modelo de datos

- ID: v0-06-model-schemas
- Fase: V0
- Paquete: packages/core/src/model
- Depende de: v0-05

## Contexto

- Diseño: docs/design/02-data-model.md §9.1, §9.2, §9.5
- ADRs: 0003
- Estándares: 01-typescript.md (tipos derivados de Zod, branded types, `exactOptionalPropertyTypes`)

## Hacer

- Esquemas para `Run`, `TestCase`, `TestResult`, `Attempt`, `ErrorOccurrence`, `NetworkSummary`, `NetworkCall` y `BddContext`, exactamente con los campos de §9.2.
- Branded types: `RunId`, `TestId`, `Fingerprint`.
- `schemaVersion` como literal `1`.
- Longitudes máximas del diseño (mensaje 2 KB, stack 8 KB) validadas en el esquema, más un helper `truncateUtf8` para que los productores trunquen antes de validar.
- Tipos exportados con `z.infer`.
- Script `schema:export` que genera JSON Schema en `packages/core/schemas/run.v1.json`.

## Decisiones abiertas en esta tarea

Si un campo del diseño es ambiguo, no lo resuelvas por tu cuenta: anótalo en el plan y pregunta.

## Criterios de aceptación

- Tests con ejemplos válidos e inválidos para cada esquema (campo faltante, tipo incorrecto, enum fuera de rango, texto demasiado largo).
- Un `Run` serializado a JSON y parseado de nuevo es igual al original.
- `truncateUtf8` no corta caracteres multibyte (test property-based).
- El JSON Schema generado está versionado y un test falla si queda desactualizado.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes

## Fuera de alcance

- Detección de renombres (V2), `Finding` (v0-09), configuración (v0-12).
