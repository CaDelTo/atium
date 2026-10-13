# Reporter SARIF 2.1.0

- ID: v1-27-reporter-sarif
- Fase: V1
- Paquete: packages/reporters/sarif
- Depende de: v1-24

## Contexto

- Diseño: docs/design/03-linter.md §11.6, docs/design/13-score-baseline-reports.md §21.5, docs/design/19-ci-cd.md §27.2
- ADRs: 0004
- Estándares: docs/engineering/02-code-design.md, 04-testing.md, 06-security.md

## Hacer

- Crear `packages/reporters/sarif` (`@atium/reporter-sarif`), que solo depende de `core`.
- Generar SARIF 2.1.0:
  - `tool.driver` con versión y `rules`, a partir de los descriptores de reglas;
  - `results` con `ruleId`, `level` (convertido desde la severidad), `message`, `locations` con la ruta relativa al repo, y `partialFingerprints` con el fingerprint del Finding;
  - `helpUri` desde `docsUrl`.
- Las rutas son POSIX relativas (`uriBaseId`), para que GitHub las asocie al PR.
- Documentar en §11.6 la conversión de severidad a `level`.

## Criterios de aceptación

- Golden file de un reporte con varias reglas.
- Test que valida la salida contra el JSON Schema oficial de SARIF 2.1.0, guardado en el repo como fixture con su origen documentado.
- Test de que un Finding sin `line` produce una ubicación válida.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes

## Fuera de alcance

- Subir el SARIF a GitHub (v1-41).
