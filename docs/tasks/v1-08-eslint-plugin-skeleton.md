# Esqueleto de `@atium/eslint-plugin`

- ID: v1-08-eslint-plugin-skeleton
- Fase: V1
- Paquete: packages/eslint-plugin
- Depende de: v1-07

## Contexto

- Diseño: docs/design/03-linter.md §11.1 y §11.2, docs/design/16-repository-structure.md §24
- ADRs: 0005, 0019, 0020 y el de v1-07
- Estándares: docs/engineering/02-code-design.md, 04-testing.md, 07-public-api.md, 09-documentation.md, 10-tooling.md

## Hacer

- Crear `packages/eslint-plugin` (`@atium/eslint-plugin`) con `exports`, `types`, `engines` y `files`. Usar el build y la configuración de los demás paquetes.
- Dependencias: ESLint 9 como peer y `@typescript-eslint/utils` para `RuleCreator`.
- Helper `createRule`, que fija `meta.docs.url` a partir del código de la regla, según v1-07.
- Lectura de `settings.atium` (`framework`, `pageObjectDirs`, `assertFunctionNames`, `i18n`; §11.1), validada con Zod y con sus defaults en `defaults.ts`. Un valor inválido da un error claro, en inglés (ADR-0019).
- Objeto del plugin para flat config (`meta`, `rules`, `configs` vacío), sin reglas todavía.
- `RuleTester` integrado con Vitest y un helper de test compartido.
- Plantilla de la página de documentación de una regla, con las 5 secciones de 09-documentation.md, en inglés (ADR-0020), en la ubicación decidida en v1-07.
- Un test que recorre `rules` y comprueba que cada regla tiene página, `meta.docs.url` y `meta.messages`.
- Capas en `.dependency-cruiser.cjs`, knip y la tabla de 02-code-design.md, según v1-07.
- README del paquete.

## Criterios de aceptación

- Un `eslint.config.js` de prueba con `plugins: { atium }` carga el plugin sin errores (test).
- Tests de `settings.atium`: defaults, valores válidos, e inválidos con su mensaje.
- El test de páginas falla si una regla no tiene página (probado con una regla ficticia en el test).
- `publint` y `attw` pasan sobre el paquete.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes

## Fuera de alcance

- Reglas y presets (v1-11 a v1-20).
