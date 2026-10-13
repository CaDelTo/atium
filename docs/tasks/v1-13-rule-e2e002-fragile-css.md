# Regla E2E002: selector CSS frágil

- ID: v1-13-rule-e2e002-fragile-css
- Fase: V1
- Paquete: packages/eslint-plugin
- Depende de: v1-09, v1-10

## Contexto

- Diseño: docs/design/03-linter.md §11.2 y §11.3 (E2E002)
- ADRs: 0005, 0019, 0020 y el de v1-07
- Estándares: docs/engineering/02-code-design.md, 04-testing.md, 09-documentation.md

## Hacer

- Analizar los strings de `locator()`, `$()` y `cy.get()` con v1-10:
  - `:nth-child` y `:nth-of-type`;
  - 3 combinadores o más (profundidad por defecto 3, configurable);
  - clases generadas;
  - ids con secuencias numéricas.
- Dentro de `pageObjectDirs`, un selector se reporta una sola vez, en su definición, y no en cada uso.
- Umbral en `defaults.ts`, con la cita de §11.3.
- Severidad, categoría y nombre en ESLint según el catálogo de v1-07; constante `RULE_*` con el código.
- `meta.messages` en inglés (ADR-0019).
- Página de documentación de la regla en inglés (ADR-0020), con las 5 secciones de 09-documentation.md.

## Criterios de aceptación

- `RuleTester` con casos válidos e inválidos para Playwright y Cypress (si aplica), incluidos todos los casos que §11.3 marca como "no detecta".
- Tests con `pageObjectDirs`: un selector definido en un Page Object da un único hallazgo.
- La página de documentación existe y el test de páginas de v1-08 pasa.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes

## Fuera de alcance

- Inclusión en los presets (v1-20).
- Selectores repetidos entre archivos (E2E007, v1-32).
