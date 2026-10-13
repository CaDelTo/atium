# Presets `recommended` y `strict`

- ID: v1-20-presets
- Fase: V1
- Paquete: packages/eslint-plugin
- Depende de: v1-11, v1-12, v1-13, v1-14, v1-15, v1-16, v1-17, v1-18, v1-19

## Contexto

- Diseño: docs/design/03-linter.md §11.1 y §11.7, docs/design/17-tech-stack.md
- ADRs: 0005 y el de v1-07
- Estándares: docs/engineering/07-public-api.md, 09-documentation.md

## Hacer

- Exponer `configs.recommended` y `configs.strict` para flat config:
  - `strict` incluye todas las reglas propias por archivo;
  - `recommended` incluye las que el catálogo de v1-07 marca como de baja tasa de falsos positivos.
- **Integración con eslint-plugin-playwright y eslint-plugin-cypress:**
  - `recommended` incluye sus reglas relevantes;
  - cuando el plugin externo ya cubre el mismo caso, desactiva la regla propia;
  - cada preset aplica el bloque del framework que corresponde (`files` o detección).
- Página de documentación con la **tabla de equivalencias** entre reglas propias y externas.
- Añadir eslint-plugin-playwright y eslint-plugin-cypress a 17-tech-stack.md: §11.1 los usa, pero la tabla del stack no los lista.
- README del paquete con el uso mínimo: `export default [atium.configs.recommended]`.

## Decisiones abiertas en esta tarea

- Si eslint-plugin-playwright y eslint-plugin-cypress van como `peerDependencies` opcionales o como `dependencies`, y qué versiones mínimas se soportan.
- La lista concreta de reglas externas en `recommended` y sus equivalencias.

## Criterios de aceptación

- Test que carga cada preset con ESLint 9 y comprueba el conjunto exacto de reglas activas, en Playwright y en Cypress.
- Test de que ninguna regla propia y su equivalente externa están activas a la vez en `recommended`.
- Test de que `strict` activa todas las reglas propias del plugin.
- La tabla de equivalencias está en la documentación.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes

## Fuera de alcance

- Reglas cross-file: no son de ESLint (v1-32 a v1-36).
