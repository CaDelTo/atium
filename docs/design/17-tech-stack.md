# Stack tecnológico

> Parte del documento de diseño de Atium. Índice: [README](README.md)

## 25. Stack tecnológico

| Área | Elección | Motivo |
|---|---|---|
| Lenguaje / runtime | TypeScript, Node.js LTS | Mismo ecosistema que Playwright y Cypress |
| Monorepo | pnpm workspaces + Turborepo | Builds incrementales y caché |
| Build | tsup | ESM + CJS para adapters |
| Versionado y publicación | Changesets | Versiones independientes por paquete |
| Tests | Vitest; `RuleTester` de ESLint | Rápido, compatible con TS |
| Validación | Zod (con exportación a JSON Schema) | Config y modelo con tipos derivados y esquema publicable |
| Carga de config | jiti ([ADR-0017](../adr/0017-carga-config-jiti.md)) | Soporta `atium.config.ts`; precedencia y validación propias |
| CLI | Commander | Los plugins van en la config; no hace falta oclif |
| Terminal | picocolors, cli-table3; respeta `NO_COLOR` | Ligeros |
| Logs de depuración | debug (`DEBUG=atium:*`) | Estándar en Node |
| Detección de CI | env-ci + reglas propias | Cubre los proveedores comunes |
| Linter | ESLint 9 + typescript-eslint (project service) | Editor, autofix, resolución entre archivos |
| Parser CSS | parsel-js | Analiza selectores CSS para E2E002 |
| Similitud | fastest-levenshtein | Renombres y duplicados |
| Archivos | tinyglobby | Búsqueda rápida de tests |
| Compresión | fflate | Runs `.ndjson.gz` y datos del reporte HTML |
| Concurrencia | p-limit | Límite de uploads y analizadores en paralelo |
| IDs | uuid v7 | Ordenables por tiempo |
| Base de datos local | SQLite (better-sqlite3) + Drizzle | Migraciones; camino a PostgreSQL |
| Storage remoto | @aws-sdk/client-s3 | Un cliente para S3 y compatibles |
| Git | simple-git | Diff, renombres, commits |
| Red | Eventos de Playwright / `cy.intercept`; HAR para exportar | Estándar, abrible en DevTools |
| Selectores | Traces de Playwright, `ariaSnapshot` | Datos ya generados por el framework |
| OpenAPI | @apidevtools/swagger-parser | Parseo y resolución de referencias |
| Coverage | monocart-coverage-reports / v8-to-istanbul | Coverage por test en Playwright |
| Cucumber | @cucumber/gherkin, @cucumber/messages | Formatos oficiales |
| Reporte HTML | React + Vite + vite-plugin-singlefile, Recharts, TanStack Table / Virtual | Un archivo estático que escala a miles de tests |
| GitHub Action | @actions/core, @actions/github | Comentarios en PR, outputs |
| Mutation (opcional) | Stryker | No reinventar |
| Documentación | Astro Starlight o VitePress | Una página por regla |

### Calidad de código

Herramientas que hacen cumplir los estándares de [`docs/engineering/`](../engineering/README.md); su configuración está en [10-tooling.md](../engineering/10-tooling.md).

| Área | Elección | Motivo |
|---|---|---|
| Formato | Prettier + eslint-config-prettier | Sin discusiones de estilo; ESLint no compite con Prettier |
| Reglas de código | typescript-eslint (`strictTypeChecked`) | Reglas con información de tipos |
| Capas y ciclos | dependency-cruiser | Verifica las dependencias permitidas entre paquetes |
| Código sin usar | knip | Archivos, exports y dependencias sin uso |
| Código duplicado | jscpd | Umbral de duplicación en `pnpm verify` |
| Code smells | eslint-plugin-sonarjs | Complejidad cognitiva, funciones y ramas duplicadas |
| Paquetes publicables | publint, @arethetypeswrong/cli | Exports, tipos y ESM/CJS correctos |
| Commits | commitlint | Conventional Commits |
| Hooks de Git | lefthook | Rápido, sin dependencias de Node en el hook |
| Property-based testing | fast-check | Normalizadores, fingerprints y fórmulas |
| Cobertura | @vitest/coverage-v8 | Umbrales por paquete |
| Mutation testing | Stryker | Nocturno sobre `core` y analizadores |
| Dependencias | Renovate | Actualizaciones con espera mínima de 14 días |

