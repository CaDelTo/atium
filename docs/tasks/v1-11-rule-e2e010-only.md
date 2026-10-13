# Regla E2E010: `.only` olvidado

- ID: v1-11-rule-e2e010-only
- Fase: V1
- Paquete: packages/eslint-plugin
- Depende de: v1-09

## Contexto

- Diseño: docs/design/03-linter.md §11.2 y §11.3 (E2E010)
- ADRs: 0005, 0019, 0020 y el de v1-07
- Estándares: docs/engineering/02-code-design.md, 04-testing.md, 09-documentation.md

## Hacer

- Detectar `test.only`, `describe.only`, `it.only` y `test.describe.only`, y sus variantes en Playwright y Mocha/Cypress, con los helpers de v1-09.
- Sugerencia que quita `.only`. No es autofix, porque cambia qué tests se ejecutan.
- Severidad, categoría y nombre en ESLint según el catálogo de v1-07; constante `RULE_*` con el código.
- `meta.messages` en inglés (ADR-0019).
- Página de documentación de la regla en inglés (ADR-0020), con las 5 secciones de 09-documentation.md.

## Criterios de aceptación

- `RuleTester` con casos válidos e inválidos para Playwright y Cypress (si aplica), incluidos todos los casos que §11.3 marca como "no detecta".
- La página de documentación existe y el test de páginas de v1-08 pasa.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes

## Fuera de alcance

- Inclusión en los presets (v1-20).
