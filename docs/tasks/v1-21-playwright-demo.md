# Repo demo con problemas sembrados

- ID: v1-21-playwright-demo
- Fase: V1
- Paquete: examples/playwright-demo
- Depende de: v1-07

## Contexto

- Diseño: docs/design/22-roadmap.md §30 (criterio de V1), docs/design/24-adoption.md §32, docs/design/21-testing-strategy.md §29 (integración: recall y precisión), docs/design/03-linter.md §11.3 y §11.4
- ADRs: 0005 y 0023
- Estándares: docs/engineering/04-testing.md

## Hacer

- Crear `examples/playwright-demo` (ya incluido en `pnpm-workspace.yaml`), privado y no publicable:
  - tests de Playwright en TypeScript, con Page Objects en un directorio de `pageObjectDirs`;
  - un `tsconfig.json`, para el project service.
- **Problemas sembrados:** al menos uno por regla, para las 9 por archivo y las 5 cross-file, incluidos sus casos de "no detecta". Por ejemplo:
  - `cy.wait("@alias")`, si el demo incluye casos de Cypress (ver Decisiones abiertas);
  - XPath por atributo;
  - `.nth()` sobre `getByRole` con nombre;
  - valores ficticios en E2E012.
- Archivos sin problemas, para medir la precisión.
- **`expected-findings.json`:** cada hallazgo esperado, con `ruleId`, `file`, `line` y el `titlePath` del test, ordenado. Es la fuente de verdad de los tests de aceptación (v1-38, v1-42).
- README del demo: qué problema hay sembrado en cada archivo.
- La app del demo no hace falta en V1: el linter solo lee el código. Se añade en V2.

## Decisiones abiertas en esta tarea

- Si `@playwright/test` entra como devDependency del demo, para que los tipos resuelvan en el project service, o si basta con declaraciones locales.
- Si los casos de Cypress van en este demo o se esperan a `examples/cypress-demo` (V6).

## Criterios de aceptación

- `expected-findings.json` tiene al menos un hallazgo de cada una de las 14 reglas de §11.3 y §11.4.
- Un test valida el formato de `expected-findings.json` con un esquema Zod y comprueba que cada `file` y `line` existe.
- `pnpm verify` pasa sin analizar el demo con las reglas propias del repo (excluido de lint, knip y jscpd donde aplique).
- `/review` sin hallazgos bloqueantes

## Fuera de alcance

- La app web del demo y la ejecución de los tests (V2).
- Comprobar que las reglas detectan los problemas: lo hacen v1-38 y v1-42.
