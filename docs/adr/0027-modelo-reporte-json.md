# ADR-0027: Modelo del reporte JSON e interfaz `Reporter`

- Estado: Aceptada
- Fecha: 2026-11-13
- Diseño relacionado: 13-score-baseline-reports.md (21.5), 14-architecture.md (22.3, 22.4), 03-linter.md (11.2, 11.6)

## Contexto

Los reporters de consola, JSON y SARIF (v1-25 a v1-27) reciben la misma entrada: el reporte. Su forma JSON es API pública y versionada (07-public-api.md), así que cambiarla después exige una `schemaVersion` nueva. La tarea v1-24 (#64) dejaba abiertas la forma y si el reporte lleva fecha, y había alternativas serias en ambas y en la interfaz `Reporter`. La persona las decidió en el plan de #64.

## Decisión

- El reporte (`ReportSchema`, `packages/core/src/model/report.ts`) lleva `schemaVersion: 1`, `toolVersion`, `findings`, `summary`, `rules` y `skippedAnalyzers`. Su JSON Schema se publica en `packages/core/schemas/report.v1.json`. La forma completa está en §21.5.
- Cada Finding del reporte es plano: todos los campos de `Finding` más `baselineState`, `"new"` o `"unchanged"`, los mismos valores que `result.baselineState` de SARIF. Sin baseline, todos son `"new"`.
- El reporte no lleva fecha: la misma entrada produce los mismos bytes y no hace falta reloj.
- Cada descriptor de regla lleva `id` (el código), `name` (un nombre legible, obligatorio para toda regla, tenga o no nombre en ESLint), `shortDescription` (el título del formato de §11.2, que también es el `shortDescription` de SARIF) y `docsUrl` opcional.
- Un analizador omitido lleva solo el tipo de motivo (`reason`, el `kind` de `SkipReason`) y, si faltan capacidades, cuáles (`missing`). El texto del error no entra: no es JSON, puede contener rutas o secretos y `runAnalyzers` ya lo registra en stderr.
- El orden, la unicidad y el resumen los garantiza `createReport`, la única función que construye reportes. El esquema no los comprueba, porque el JSON Schema no puede expresarlos y el publicado debe coincidir con el de Zod.
- `Reporter` tiene `id` (el valor de `--format`) y `render(report)`, que devuelve `Promise<string | Uint8Array>`. No escribe archivos: eso lo hace el CLI.

## Consecuencias

- `jq '.findings[] | select(.baselineState == "new")'` filtra los nuevos y SARIF copia el valor sin convertirlo.
- Un consumidor que quiera saber cuándo se generó el reporte usa la fecha del archivo o del job de CI.
- Las reglas sin nombre en ESLint (cross-file y las de otros analizadores) necesitan un `name` legible.
- Un reporter síncrono devuelve una promesa resuelta. A cambio, un reporter que comprima o lea plantillas (HTML en V2) no rompe la interfaz.
- Para conocer el error de un analizador omitido hay que mirar stderr.

## Alternativas descartadas

- Finding envuelto (`{ finding, baselineState }`): separa el Finding original, pero obliga a cada consumidor a desenvolverlo y no coincide con SARIF.
- Dos listas, `new` y `baseline`: rompe el orden único de `compareFindings` y duplica la lógica de cada reporter.
- `generatedAt` con reloj inyectado: hace que dos ejecuciones iguales den bytes distintos, lo que estorba en golden files y en diffs.
- `render` síncrono: más simple hoy, pero pasar a asíncrono después rompe a los plugins.
- `name` opcional (solo el nombre de ESLint): deja sin título a las reglas cross-file y no da a la consola el título de §11.2.
- Incluir un mensaje de error redactado en los omitidos: añade texto libre a la API pública y riesgo de filtrar datos, sin un consumidor que lo necesite.
