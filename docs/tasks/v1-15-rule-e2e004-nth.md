# Regla E2E004: uso de `.nth()`

- ID: v1-15-rule-e2e004-nth
- Fase: V1
- Paquete: packages/eslint-plugin
- Depende de: v1-09

## Contexto

- Diseño: docs/design/03-linter.md §11.2 y §11.3 (E2E004)
- ADRs: 0005, 0019, 0020 y el de v1-07
- Estándares: docs/engineering/02-code-design.md, 04-testing.md, 09-documentation.md

## Hacer

- Detectar `.nth(n)` con n > 0, y `.first()` o `.last()` encadenados a locators no únicos.
- No detectar `.nth()` sobre `getByRole` con nombre.
- Umbral configurable como opción de la regla, con su default en `defaults.ts`.
- Severidad, categoría y nombre en ESLint según el catálogo de v1-07; constante `RULE_*` con el código.
- `meta.messages` en inglés (ADR-0019).
- Página de documentación de la regla en inglés (ADR-0020), con las 5 secciones de 09-documentation.md.

## Decisiones abiertas en esta tarea

- §11.3 da como umbral "Configurable" sin valor por defecto: qué se configura (por ejemplo, el n mínimo) y su default.
- Qué cuenta como "locator no único" para `.first()` y `.last()` en un análisis estático.

## Criterios de aceptación

- `RuleTester` con casos válidos e inválidos para Playwright y Cypress (si aplica), incluidos todos los casos que §11.3 marca como "no detecta".
- La página de documentación existe y el test de páginas de v1-08 pasa.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes

## Fuera de alcance

- Inclusión en los presets (v1-20).
