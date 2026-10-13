# Regla E2E003: XPath posicional

- ID: v1-14-rule-e2e003-positional-xpath
- Fase: V1
- Paquete: packages/eslint-plugin
- Depende de: v1-09, v1-10

## Contexto

- Diseño: docs/design/03-linter.md §11.2 y §11.3 (E2E003)
- ADRs: 0005, 0019, 0020 y 0023
- Estándares: docs/engineering/02-code-design.md, 04-testing.md, 09-documentation.md

## Hacer

- Detectar XPath con predicados posicionales `[n]` y rutas absolutas `/html/...`, en `locator("xpath=...")`, `locator("//...")` y `cy.xpath`, si se usa.
- No detectar XPath por atributo (`//button[@data-testid='x']`).
- Severidad, categoría y nombre en ESLint según el catálogo de 03-linter.md §11.8 (ADR-0023); constante `RULE_*` con el código.
- `meta.messages` en inglés (ADR-0019).
- Página de documentación de la regla en inglés (ADR-0020), con las 5 secciones de 09-documentation.md.

## Criterios de aceptación

- `RuleTester` con casos válidos e inválidos para Playwright y Cypress (si aplica), incluidos todos los casos que §11.3 marca como "no detecta".
- La página de documentación existe y el test de páginas de v1-08 pasa.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes

## Fuera de alcance

- Inclusión en los presets (v1-20).
