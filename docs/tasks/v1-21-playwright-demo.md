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
  - `cy.wait("@alias")`, si el demo incluye casos de Cypress (ver Decisiones tomadas en esta tarea);
  - XPath por atributo;
  - `.nth()` sobre `getByRole` con nombre;
  - valores ficticios en E2E012.
- Archivos sin problemas, para medir la precisión.
- **`expected-findings.json`:** cada hallazgo esperado, con `ruleId`, `file`, `line` y el `titlePath` del test, ordenado. Es la fuente de verdad de los tests de aceptación (v1-38, v1-42).
- README del demo: qué problema hay sembrado en cada archivo.
- La app del demo no hace falta en V1: el linter solo lee el código. Se añade en V2.

## Decisiones tomadas en esta tarea

- `@playwright/test` entra como devDependency exacta del demo (1.63.0): los tipos resuelven de verdad en el project service y `tsc` comprueba que el demo compila. No es una dependencia de ningún paquete publicado ni fija la versión mínima soportada, que sigue abierta.
- Los casos de Cypress, como `cy.wait("@alias")` de E2E001, se esperan a `examples/cypress-demo` (V6): mezclarlos exigiría los tipos de Cypress en un proyecto de Playwright.
- El demo no trae `eslint.config.js` ni `atium.config`: el plugin, los presets y las secciones `lint` y `rules` del esquema aún no existen. Los crea v1-38 con la configuración que describe el README del demo.
- Las convenciones de `expected-findings.json` que el diseño no fija (línea del nodo, `titlePath` vacío fuera de un test, E2E007 por uso, E2E013 en el segundo test del par, E2E006b en lugar de E2E006) están en el README del demo. La tarea de cada regla las cambia en el mismo cambio si decide otra cosa.

## Criterios de aceptación

- `expected-findings.json` tiene al menos un hallazgo de cada una de las 14 reglas de §11.3 y §11.4.
- Un test valida el formato de `expected-findings.json` con un esquema Zod y comprueba que cada `file` y `line` existe.
- `pnpm verify` pasa sin analizar el demo con las reglas propias del repo (excluido de lint, knip y jscpd donde aplique).
- `/review` sin hallazgos bloqueantes

## Fuera de alcance

- La app web del demo y la ejecución de los tests (V2).
- Comprobar que las reglas detectan los problemas: lo hacen v1-38 y v1-42.
