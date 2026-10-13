# Regla E2E005: test demasiado grande

- ID: v1-17-rule-e2e005-test-size
- Fase: V1
- Paquete: packages/eslint-plugin
- Depende de: v1-09

## Contexto

- Diseño: docs/design/03-linter.md §11.2 y §11.3 (E2E005)
- ADRs: 0005, 0019, 0020 y 0023
- Estándares: docs/engineering/02-code-design.md, 04-testing.md, 09-documentation.md

## Hacer

- Contar acciones por test con la lista de v1-09 (`click`, `fill`, `goto`, `press`, `check`, `selectOption` y comandos `cy.*`) y líneas por test.
- Umbrales por defecto: 25 acciones o 150 líneas (§11.3), en `defaults.ts`, configurables como opciones de la regla.
- Las acciones dentro de `test.step` cuentan para el test que las contiene.
- Severidad, categoría y nombre en ESLint según el catálogo de 03-linter.md §11.8 (ADR-0023); constante `RULE_*` con el código.
- `meta.messages` en inglés (ADR-0019).
- Página de documentación de la regla en inglés (ADR-0020), con las 5 secciones de 09-documentation.md.

## Criterios de aceptación

- `RuleTester` con casos válidos e inválidos para Playwright y Cypress (si aplica), incluidos todos los casos que §11.3 marca como "no detecta".
- Tests en el límite: 25 acciones no reportan y 26 sí; 150 líneas no reportan y 151 sí.
- La página de documentación existe y el test de páginas de v1-08 pasa.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes

## Fuera de alcance

- Inclusión en los presets (v1-20).
