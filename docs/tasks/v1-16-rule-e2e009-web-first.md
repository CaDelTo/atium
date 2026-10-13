# Regla E2E009: assertions no web-first

- ID: v1-16-rule-e2e009-web-first
- Fase: V1
- Paquete: packages/eslint-plugin
- Depende de: v1-09

## Contexto

- Diseño: docs/design/03-linter.md §11.2 y §11.3 (E2E009)
- ADRs: 0005, 0019, 0020 y 0023
- Estándares: docs/engineering/02-code-design.md, 04-testing.md, 09-documentation.md

## Hacer

- Detectar `expect(await x.isVisible()).toBe(true)`, `expect(await x.textContent())...` y `expect(await locator.count())...`.
- Autofix solo cuando la transformación a la assertion web-first equivalente es segura (por ejemplo, `toBeVisible()`, `toHaveText()` y `toHaveCount()`). En los demás casos, sugerencia.
- Severidad, categoría y nombre en ESLint según el catálogo de 03-linter.md §11.8 (ADR-0023); constante `RULE_*` con el código.
- `meta.messages` en inglés (ADR-0019).
- Página de documentación de la regla en inglés (ADR-0020), con las 5 secciones de 09-documentation.md.

## Criterios de aceptación

- `RuleTester` con casos válidos e inválidos para Playwright y Cypress (si aplica), incluidos todos los casos que §11.3 marca como "no detecta".
- Tests de la salida del autofix en cada transformación segura, y un test de que no hay `fix` en los casos no seguros.
- La página de documentación existe y el test de páginas de v1-08 pasa.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes

## Fuera de alcance

- Inclusión en los presets (v1-20).
