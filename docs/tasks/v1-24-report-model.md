# Modelo del reporte e interfaz `Reporter`

- ID: v1-24-report-model
- Fase: V1
- Paquete: packages/core
- Depende de: v1-07

## Contexto

- Diseño: docs/design/13-score-baseline-reports.md §21.5, docs/design/14-architecture.md §22.3 y §22.4, docs/design/03-linter.md §11.6
- ADRs: 0003, 0004, 0019
- Estándares: docs/engineering/02-code-design.md (determinismo de salidas), 07-public-api.md (el esquema del reporte JSON es público)

Los reporters de consola, JSON y SARIF (v1-25 a v1-27) reciben la misma entrada.

## Hacer

- Esquema Zod del reporte, con `schemaVersion`:
  - Findings ordenados;
  - estado de cada Finding respecto al baseline (nuevo o en baseline);
  - resumen por severidad y por regla;
  - descriptores de las reglas (código, nombre, descripción corta y `docsUrl`), que SARIF necesita;
  - versión de la herramienta;
  - analizadores omitidos con su motivo.
- Interfaz `Reporter` (§22.4): recibe el reporte y devuelve el texto o los bytes. No escribe archivos; eso lo hace el CLI.
- Generar y publicar el JSON Schema del reporte en `packages/core/schemas/` (§24).
- Documentar el esquema en §21.5. Si la forma tiene alternativas serias, escribir un ADR (09-documentation.md).

## Decisiones abiertas en esta tarea

- La forma concreta del reporte JSON: es API pública y versionada.
- Si el reporte lleva fechas: un reporte sin fecha es determinista. Si la lleva, el reloj se inyecta.

## Criterios de aceptación

- Tests del esquema con builders: un reporte válido, campos desconocidos rechazados y `schemaVersion` obligatoria.
- Test de que el JSON Schema publicado coincide con el generado desde Zod.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes

## Fuera de alcance

- Reporters concretos (v1-25 a v1-27), HTML (V2) y JUnit.
- Score (§21.1).
