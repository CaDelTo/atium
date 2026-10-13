# Análisis y clasificación de selectores

- ID: v1-10-selector-parsing
- Fase: V1
- Paquete: packages/eslint-plugin (subpath de sintaxis compartida, según v1-07)
- Depende de: v1-08

## Contexto

- Diseño: docs/design/03-linter.md §11.3 (E2E002, E2E003) y §11.4 (E2E007, E2E013), docs/design/06-selector-advisor.md §14.1
- ADRs: 0005, 0009 y el de v1-07
- Estándares: docs/engineering/02-code-design.md, 04-testing.md, docs/design/17-tech-stack.md (parsel-js)

Lo usan E2E002, E2E003, E2E007 y E2E013, y más adelante el Selector Advisor (V5).

## Hacer

- **CSS** (con parsel-js):
  - detectar `:nth-child`, `:nth-of-type`, el número de combinadores, las clases generadas (`css-1a2b3c`, `sc-*`, `jsx-*`) y los ids con secuencias numéricas;
  - un selector que no se puede parsear se trata como desconocido, sin lanzar.
- **XPath:** predicados posicionales `[n]` y rutas absolutas `/html/...`; `//button[@data-testid='x']` no es posicional.
- **Clasificación en los 5 niveles de §14.1**, a partir de una llamada de locator (`getByRole` con nombre, `getByLabel`, `getByTestId`, CSS…). Con `i18n: true`, el texto visible baja por debajo del test id.
- **Normalización de un selector**, para comparar E2E007 entre archivos.
- Patrones en `defaults.ts`, con la cita del diseño.

## Decisiones abiertas en esta tarea

- Qué es un "id con secuencias numéricas" (§11.3 E2E002): longitud y forma.
- Qué normaliza la normalización de E2E007: espacios, comillas, orden de atributos, mayúsculas…

## Criterios de aceptación

- Tests de cada patrón de §11.3 con casos positivos y negativos.
- Tests de clasificación con los ejemplos de la tabla de §14.1 y del caso `i18n`.
- Property-based:
  - la normalización es idempotente;
  - el parser nunca lanza con strings arbitrarios.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes

## Fuera de alcance

- Puntuación y generación de candidatos (§14.3, V5).
