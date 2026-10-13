# Reconocimiento de tests, acciones y assertions

- ID: v1-09-e2e-syntax
- Fase: V1
- Paquete: packages/eslint-plugin (subpath de sintaxis compartida, según v1-07)
- Depende de: v1-08

## Contexto

- Diseño: docs/design/03-linter.md §11.1 y §11.3 (E2E001, E2E004, E2E005, E2E006, E2E009, E2E010), docs/design/02-data-model.md §9.3 (`titlePath`)
- ADRs: 0005 y el de v1-07
- Estándares: docs/engineering/02-code-design.md, 04-testing.md

Lo usan casi todas las reglas por archivo y `suite-index` (v1-29), así que va en su propia tarea, antes que ellas.

## Hacer

- Helpers puros sobre el AST ESTree de typescript-eslint:
  - **Framework:** detectar Playwright o Cypress por los imports, con prioridad para `settings.atium.framework`.
  - **Estructura del test:** reconocer tests, describes, hooks y steps:
    - Playwright: `test`, `test.describe`, `test.step`, `test.beforeEach` y variantes como `.only`, `.skip` y `.serial`;
    - Mocha/Cypress: `it`, `describe`, `context` y hooks.
  - **Contexto de un nodo:** el test que contiene un nodo y su `titlePath`, unido con `" › "` como en §9.3. Si el título no es un literal, se resuelve como en el diseño o se marca como no estático.
  - **Acciones:** `click`, `fill`, `goto`, `press`, `check`, `selectOption` y comandos `cy.*`, según §11.3, E2E005.
  - **Assertions:**
    - `expect(...)`, `.should()` y `.and()`;
    - los nombres de `assertFunctionNames`, con globs como `verify*`.
  - **Locators:** `locator()`, `$()`, `cy.get()`, `getBy*`, `.nth()`, `.first()` y `.last()`.
- Listas de nombres en `defaults.ts`, con la cita del diseño.

## Criterios de aceptación

- Tests unitarios sobre código fuente parseado de Playwright y de Cypress, para cada helper.
- Un test por cada caso que §11.3 marca como "no detecta"; por ejemplo, `cy.wait("@alias")` no es una acción de espera fija.
- Property-based para el `titlePath`: es estable ante cambios de espacios y saltos de línea.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes

## Fuera de alcance

- Resolución de helpers de otros archivos (v1-30, v1-33).
- Análisis de selectores (v1-10).
