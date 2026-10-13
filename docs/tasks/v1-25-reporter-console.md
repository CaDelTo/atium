# Reporter de consola

- ID: v1-25-reporter-console
- Fase: V1
- Paquete: packages/reporters/console
- Depende de: v1-24

## Contexto

- Diseño: docs/design/03-linter.md §11.2, docs/design/13-score-baseline-reports.md §21.5, docs/design/18-cli-config.md §26.1 (`NO_COLOR`)
- ADRs: 0019
- Estándares: docs/engineering/02-code-design.md, 04-testing.md (golden files), docs/design/17-tech-stack.md (picocolors, cli-table3)

## Hacer

- Crear `packages/reporters/console` (`@atium/reporter-console`), que solo depende de `core`.
- Formato de §11.2: código, título, `archivo:línea`, fragmento de código, explicación, sugerencia y enlace a la documentación. Al final, un resumen por severidad.
- Agrupar por archivo, en el orden de `compareFindings`.
- Colores con picocolors; sin color con `NO_COLOR` o si la salida no es una terminal (inyectado).
- Escapar los caracteres de control de los textos, como en el CLI (§26.2).
- Marcar los hallazgos en baseline, o no mostrarlos, según se decida en esta tarea.

## Decisiones abiertas en esta tarea

- Si los hallazgos que ya están en el baseline se muestran marcados o se ocultan. ADR-0023 solo decide que el código de salida de `atium lint` cuenta los nuevos.

## Criterios de aceptación

- Golden files: reporte vacío, un hallazgo con sugerencia, varios archivos, y con y sin color.
- Test de que un mensaje con caracteres de control sale escapado.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes

## Fuera de alcance

- Score y tablas de resumen de §21.2 y §33.
