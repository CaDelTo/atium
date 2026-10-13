# Regla E2E001: hard waits

- ID: v1-12-rule-e2e001-hard-wait
- Fase: V1
- Paquete: packages/eslint-plugin
- Depende de: v1-09

## Contexto

- Diseño: docs/design/03-linter.md §11.2 y §11.3 (E2E001)
- ADRs: 0005, 0019, 0020 y 0023
- Estándares: docs/engineering/02-code-design.md, 04-testing.md, 09-documentation.md

## Hacer

- Detectar:
  - `page.waitForTimeout(n)` y `frame.waitForTimeout(n)`;
  - `cy.wait(<número>)`;
  - `await new Promise(r => setTimeout(r, n))` dentro de tests.
- No detectar `cy.wait("@alias")`.
- Sin autofix. Sugerencia editable con el formato de §11.2.
- Severidad, categoría y nombre en ESLint según el catálogo de 03-linter.md §11.8 (ADR-0023); constante `RULE_*` con el código.
- `meta.messages` en inglés (ADR-0019).
- Página de documentación de la regla en inglés (ADR-0020), con las 5 secciones de 09-documentation.md.

## Criterios de aceptación

- `RuleTester` con casos válidos e inválidos para Playwright y Cypress (si aplica), incluidos todos los casos que §11.3 marca como "no detecta".
- Test de que la regla no ofrece `fix`, solo `suggest`.
- La página de documentación existe y el test de páginas de v1-08 pasa.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes

## Fuera de alcance

- Inclusión en los presets (v1-20).
