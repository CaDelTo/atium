# Alinear el diseño con lo implementado en V0

- ID: v1-05-design-alignment
- Fase: V1
- Paquete: docs/design
- Depende de: ninguna
- Origen: `/audit` de cierre de V0 (#20)

## Contexto

- Diseño: docs/design/17-tech-stack.md, 02-data-model.md §10.1, 15-storage.md §23, 20-security-privacy.md
- ADRs: 0018
- Estándares: docs/engineering/README.md (Definition of Done: diseño actualizado)

## Hacer

- 17-tech-stack.md:24 dice que los `.ndjson.gz` se comprimen con fflate, pero core usa `node:zlib` (`run-file-writer.ts:6`, `run-file-reader.ts:2`) y no declara fflate. Escribir la decisión y su motivo, o proponer el cambio de implementación.
- 02-data-model.md:187: la tabla pone `CI_JOB_ID` en la columna "intento", pero §10.1 y el código (`providers.ts:81`) lo usan como `jobId`. Corregir la tabla.
- `packages/cli/src/defaults.ts:5`: la cita "03-errors-logging.md" no lleva el prefijo `engineering/`.
- Escribir en el diseño, tras confirmarlas, las decisiones que hoy solo están en el código:
  1. Los endpoints con fallos también se ordenan entre sí por `count` (`cap-run.ts:101`). ADR-0018:65 fija "primero los que tienen fallos, después los de mayor `count`", pero no dice si el orden por `count` se aplica dentro del grupo con fallos.
  2. Una clave de `statuses` ≥ 400 con conteo 0 cuenta como fallo (`cap-run.ts:95`).
  3. Límites exactos: el lector acepta una línea de exactamente 1 MiB (`line-reader.ts:125`) y la garantía final usa `<=` (`fit-line.ts:135`), mientras ADR-0018:89 dice "por debajo".
  4. "2 KB" y "8 KB" se interpretaron como KiB (`defaults.ts:40,42`).
  5. El payload de GitHub solo se lee con proveedor `github` (`detect-run-context.ts:112`).
  6. Si hay varias variables de detección, gana el orden de la tabla (`providers.ts:58`).
  7. Mapeo de env-ci: `build` → `runId`, `job` → `jobId`, `pr` → `prNumber` (`env-ci-fallback.ts:79`).
  8. Redacción: `aws-key` acepta solo mayúsculas y dígitos tras `A3T` (`patterns.ts:49`), y la normalización de nombres trata como dígito cualquier `\p{N}` (`redactor.ts:7`).
- Umbral de cobertura de `packages/cli`: `vitest.config.ts` exige 90 %, pero `docs/engineering/04-testing.md` pide 80 % para "resto" (handoff de #20). Alinear el estándar o la configuración, según decida el usuario.

## Decisiones abiertas en esta tarea

- Cada punto de la lista anterior necesita la confirmación de una persona. Si alguno contradice un ADR, proponer un ADR que lo reemplace.

## Criterios de aceptación

- El diseño describe lo que hace el código en cada punto confirmado, o hay una tarea que cambia el código.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes

## Fuera de alcance

- Cambios de código salvo la cita de `cli/src/defaults.ts`.
