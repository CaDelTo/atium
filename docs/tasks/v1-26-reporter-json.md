# Reporter JSON

- ID: v1-26-reporter-json
- Fase: V1
- Paquete: packages/reporters/json
- Depende de: v1-24

## Contexto

- Diseño: docs/design/13-score-baseline-reports.md §21.5
- ADRs: 0003, 0004
- Estándares: docs/engineering/02-code-design.md (salidas para máquinas sin locale y ordenadas), 04-testing.md, 07-public-api.md

## Hacer

- Crear `packages/reporters/json` (`@atium/reporter-json`), que solo depende de `core`.
- Serializar el reporte de v1-24, con claves en orden estable y validado con su esquema antes de escribirlo.
- Salida determinista: misma entrada, mismos bytes.

## Criterios de aceptación

- Golden file de un reporte con varios hallazgos.
- Test de que la salida valida contra el JSON Schema publicado en v1-24.
- Property-based: la salida no depende del orden de entrada de los Findings.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes

## Fuera de alcance

- Otros formatos.
