# Architecture Decision Records

Decisiones de diseño ya tomadas. Para cambiar una, se crea un ADR nuevo que la reemplace; no se edita la original salvo para marcarla como reemplazada.

| ADR | Decisión | Estado |
|---|---|---|
| [0001](0001-monorepo-pnpm-turborepo.md) | Monorepo con pnpm workspaces y Turborepo | Aceptada |
| [0002](0002-typescript-esm-node.md) | TypeScript, ESM primero y Node.js 22+ | Aceptada |
| [0003](0003-modelo-datos-ctrf-zod.md) | Modelo de datos basado en CTRF, definido con Zod, con resultados e intentos separados | Aceptada |
| [0004](0004-finding-unificado.md) | Finding unificado como única salida de los analizadores | Aceptada |
| [0005](0005-linter-eslint-plugin.md) | Linter como plugin de ESLint más índice cross-file en el CLI | Aceptada |
| [0006](0006-fail-open.md) | Fail-open en todas las capas | Aceptada |
| [0007](0007-storage-inmutable-compactacion.md) | Storage con archivos inmutables y compactación | Aceptada |
| [0008](0008-stryker-y-test-gaps.md) | Integrar Stryker y priorizar Test Gap Analysis sobre un motor de mutación propio | Aceptada |
| [0009](0009-selector-advisor-solo-sugiere.md) | Selector Advisor en lugar de self-healing; solo sugerencias | Aceptada |
| [0010](0010-gate-y-cuarentena.md) | El gate lo decide Atium; cuarentena versionada en el repo | Aceptada |
| [0011](0011-llm-opt-in.md) | LLM opcional, sin efecto en score ni gate | Aceptada |
| [0012](0012-cli-commander-plugins-config.md) | Commander para el CLI; plugins declarados en la configuración | Aceptada |
| [0013](0013-codename-nameless.md) | Codename provisional "nameless" | Reemplazada por 0016 |
| [0014](0014-estandares-ingenieria.md) | Estándares de ingeniería aplicados por herramientas | Aceptada |
| [0015](0015-subagentes-y-revision.md) | Subagentes por nivel de modelo y revisión automatizada | Aceptada |
| [0016](0016-codename-atium.md) | Codename provisional "atium" | Aceptada |
| [0017](0017-carga-config-jiti.md) | Carga del archivo de configuración con jiti | Aceptada |
| [0018](0018-formato-archivos-run.md) | Formato NDJSON de los archivos de run y límites de tamaño | Aceptada |
| [0019](0019-idioma-mensajes-cli-reglas.md) | Mensajes del CLI, de las reglas y de los reportes en inglés | Aceptada |
| [0020](0020-idioma-documentacion-publica.md) | Documentación pública en inglés | Aceptada |
| [0021](0021-typescript-6.md) | TypeScript 6 mientras el toolchain no soporte TypeScript 7 | Aceptada |
| [0022](0022-logger-reloj-en-core.md) | Logger y reloj implementados en core, y `DEBUG` leído sin el paquete debug | Aceptada |
| [0023](0023-arquitectura-linter.md) | Arquitectura del linter: capas, nombres, catálogo, documentación, `atium lint` y contexto de los analizadores | Aceptada |
| [0024](0024-licencia-apache-2.md) | Licencia Apache-2.0 y repositorio público | Aceptada |

Plantilla: [0000-template.md](0000-template.md)
