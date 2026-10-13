# Regla E2E006: assertions insuficientes

- ID: v1-18-rule-e2e006-assertions
- Fase: V1
- Paquete: packages/eslint-plugin
- Depende de: v1-09

## Contexto

- Diseño: docs/design/03-linter.md §11.2 y §11.3 (E2E006)
- ADRs: 0005, 0019, 0020 y 0023
- Estándares: docs/engineering/02-code-design.md, 04-testing.md, 09-documentation.md

## Hacer

- Reportar tests con al menos una acción y menos assertions que el umbral (por defecto 1, en `defaults.ts`).
- Cuenta como assertion:
  - `expect(...)`, `.should()` y `.and()`;
  - las funciones de `assertFunctionNames`;
  - los helpers del mismo archivo que contengan assertions, a un nivel.
- Los helpers de otros archivos no se resuelven aquí; los resuelve E2E006b (v1-33).
- Severidad, categoría y nombre en ESLint según el catálogo de 03-linter.md §11.8 (ADR-0023); constante `RULE_*` con el código.
- `meta.messages` en inglés (ADR-0019).
- Página de documentación de la regla en inglés (ADR-0020), con las 5 secciones de 09-documentation.md.

## Criterios de aceptación

- `RuleTester` con casos válidos e inválidos para Playwright y Cypress (si aplica), incluidos todos los casos que §11.3 marca como "no detecta".
- Tests de helpers del mismo archivo: con una assertion a un nivel cuentan; a dos niveles no cuentan.
- La página de documentación existe y el test de páginas de v1-08 pasa.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes

## Fuera de alcance

- Inclusión en los presets (v1-20).
- Resolución de helpers importados (E2E006b, v1-33).
