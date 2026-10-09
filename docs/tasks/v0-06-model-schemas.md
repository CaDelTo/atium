# Esquemas Zod del modelo de datos

- ID: v0-06-model-schemas
- Fase: V0
- Paquete: packages/core/src/model
- Depende de: v0-05

## Contexto

- Diseño: docs/design/02-data-model.md §9.1, §9.2, §9.5
- ADRs: 0003, 0018
- Estándares: 01-typescript.md (tipos derivados de Zod, branded types, `exactOptionalPropertyTypes`)

## Hacer

- Esquemas para `Run`, `TestCase`, `TestResult`, `Attempt`, `ErrorOccurrence`, `NetworkSummary`, `NetworkCall` y `BddContext`, exactamente con los campos de §9.2.
- Branded types: `RunId`, `TestId`, `Fingerprint`.
- `schemaVersion` como literal `1`.
- Longitudes máximas del diseño (mensaje 2 KB, stack 8 KB) validadas en el esquema, más un helper `truncateUtf8` para que los productores trunquen antes de validar. Los topes de texto se miden en bytes UTF-8 del valor ya escapado para JSON, sin comillas (ADR-0018); el helper y el esquema usan esa misma medida.
- El esquema valida los topes de ADR-0018:
  - listas: `attempts` ≤ 20, `tags` ≤ 50, `titlePath` ≤ 20, `frameworkConfig.projects` ≤ 100, `calls` ≤ 200, `endpoints` ≤ 200, `pageErrors` ≤ 20, `console.samples` ≤ 5, `steps` ≤ 200;
  - textos: cada `pageErrors[i]` ≤ 2 KiB, cada muestra de consola ≤ 1 KiB, `matcher.expected` y `matcher.actual` ≤ 2 KiB, `text` de paso BDD ≤ 512 B, `definition` ≤ 256 B, cada nombre de proyecto ≤ 256 B, cualquier otro string sin tope propio ≤ 2 KiB.
  Los valores viven en el `defaults.ts` de core con referencia al ADR.
- Campos de conteo de descartados `attemptsDropped`, `callsDropped`, `endpointsDropped`, `pageErrorsDropped` y `stepsDropped`: enteros positivos y opcionales, que se omiten cuando valen 0.
- `TestResult.detailTruncated`: literal `true` y opcional.
- `artifacts.*` son rutas a archivos, también `ariaSnapshot` (§9.2).
- Tipos exportados con `z.infer`.
- Script `schema:export` que genera JSON Schema en `packages/core/schemas/run.v1.json`.

## Decisiones abiertas en esta tarea

Si un campo del diseño es ambiguo, no lo resuelvas por tu cuenta: anótalo en el plan y pregunta.

## Criterios de aceptación

- Tests con ejemplos válidos e inválidos para cada esquema (campo faltante, tipo incorrecto, enum fuera de rango, texto demasiado largo, lista por encima de su tope, conteo de descartados igual a 0 o negativo, `detailTruncated: false`).
- Un `Run` serializado a JSON y parseado de nuevo es igual al original.
- `truncateUtf8` no corta caracteres multibyte, pares sustitutos ni secuencias de escape, y el valor escapado resultante nunca supera el tope (test property-based).
- Un string con caracteres de control que cabe en su tope sin escapar pero no una vez escapado es inválido.
- El JSON Schema generado está versionado y un test falla si queda desactualizado.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes

## Fuera de alcance

- Detección de renombres (V2), `Finding` (v0-09), configuración (v0-12).
- Aplicar los topes al escribir (v0-14).
