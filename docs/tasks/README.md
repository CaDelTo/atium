# Tareas

Cada tarea es un archivo `docs/tasks/<fase>-<nn>-<nombre>.md` (por ejemplo `v0-03-model.md`) con su especificación, y un issue en GitHub que guarda su estado (salvo v0-01 a v0-03, terminadas antes de este flujo). Se inicia en Claude Code con `/task <n>` (número de issue, también `#<n>`) o `/task docs/tasks/<archivo>`.

Una tarea debe poder completarse en una sesión y en un PR de menos de 400 líneas.

## Plantilla

```markdown
# <Título>

- ID: v0-03-model
- Fase: V0
- Paquete: packages/core
- Depende de: v0-02-config (o "ninguna")
- Origen: (opcional) de dónde sale la tarea si no es del roadmap, como un `/audit`

## Contexto

Diseño: docs/design/XX-*.md §N
ADRs: 0003, 0004
Estándares: docs/engineering/01-typescript.md, 04-testing.md

## Hacer

- ...

## Decisiones abiertas en esta tarea

(Opcional) Valores o comportamientos que el diseño no define y que hay que proponer en el plan.

## Criterios de aceptación

- ...
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes

## Fuera de alcance

- ...
```

## Estado

El estado se consulta en GitHub Issues, no en este archivo. Cada fase tiene un milestone y cada tarea un issue con las etiquetas `phase:vN` y `type:task` (formato en [08-git-workflow.md](../engineering/08-git-workflow.md#issues)):

| Estado | En GitHub |
|---|---|
| Pendiente | Abierto, sin rama, PR ni worktree, con todas sus dependencias cerradas o Hechas |
| En curso | Abierto, con rama, PR o worktree `atium-<n>` (creado por `/parallel`) |
| Bloqueada | Abierto, sin rama, PR ni worktree, con alguna dependencia abierta |
| Hecha | Cerrado |

La siguiente tarea es el issue abierto más antiguo del milestone actual cuyas dependencias estén cerradas o Hechas y que no tenga rama, PR ni worktree. Para hacer varias a la vez, `/parallel`. El PR de cada tarea incluye `Closes #<n>`; solo una persona cierra issues y mergea PRs.

### V0 — Fundaciones

Criterio de la fase: docs/design/22-roadmap.md §30.

| Tarea | Título | Depende de | Issue |
|---|---|---|---|
| [v0-01-monorepo-bootstrap](v0-01-monorepo-bootstrap.md) | Bootstrap del monorepo | ninguna | Hecha ([PR #1](https://github.com/CaDelTo/atium/pull/1)) |
| [v0-02-core-skeleton](v0-02-core-skeleton.md) | Esqueleto del paquete core | v0-01 | Hecha ([PR #3](https://github.com/CaDelTo/atium/pull/3)) |
| [v0-03-quality-tooling](v0-03-quality-tooling.md) | Herramientas de calidad y `pnpm verify` | v0-02 | Hecha ([PR #3](https://github.com/CaDelTo/atium/pull/3)) |
| [v0-04-ci-pipeline](v0-04-ci-pipeline.md) | Pipeline de CI y plantillas del repositorio | v0-03 | [#5](https://github.com/CaDelTo/atium/issues/5) |
| [v0-05-errors-result-failopen](v0-05-errors-result-failopen.md) | Errores, `Result` y `failOpen` | v0-02 | [#6](https://github.com/CaDelTo/atium/issues/6) |
| [v0-06-model-schemas](v0-06-model-schemas.md) | Esquemas Zod del modelo de datos | v0-05 | [#7](https://github.com/CaDelTo/atium/issues/7) |
| [v0-07-test-builders](v0-07-test-builders.md) | Builders de datos de prueba | v0-06 | [#8](https://github.com/CaDelTo/atium/issues/8) |
| [v0-08-identity-and-paths](v0-08-identity-and-paths.md) | Identidad de tests y rutas | v0-06 | [#9](https://github.com/CaDelTo/atium/issues/9) |
| [v0-09-finding-model](v0-09-finding-model.md) | Modelo de Finding y orden determinista | v0-06 | [#10](https://github.com/CaDelTo/atium/issues/10) |
| [v0-10-redaction](v0-10-redaction.md) | Redacción de datos sensibles | v0-05 | [#11](https://github.com/CaDelTo/atium/issues/11) |
| [v0-11-logger-clock](v0-11-logger-clock.md) | Logger y reloj | v0-10 | [#12](https://github.com/CaDelTo/atium/issues/12) |
| [v0-12-config](v0-12-config.md) | Configuración: esquema, carga y precedencia | v0-11 | [#13](https://github.com/CaDelTo/atium/issues/13) |
| [v0-13-ci-context](v0-13-ci-context.md) | Detección de contexto de git y CI | v0-12 | [#14](https://github.com/CaDelTo/atium/issues/14) |
| [v0-14-run-files](v0-14-run-files.md) | Archivos de run (`.ndjson.gz`) | v0-13 | [#15](https://github.com/CaDelTo/atium/issues/15) |
| [v0-15-storage-contract](v0-15-storage-contract.md) | Interfaces de storage, contrato y fake en memoria | v0-14 | [#16](https://github.com/CaDelTo/atium/issues/16) |
| [v0-16-storage-sqlite](v0-16-storage-sqlite.md) | Backend SQLite | v0-15 | [#17](https://github.com/CaDelTo/atium/issues/17) |
| [v0-17-cli-skeleton](v0-17-cli-skeleton.md) | CLI base e `init` | v0-12 | [#18](https://github.com/CaDelTo/atium/issues/18) |
| [v0-18-doctor](v0-18-doctor.md) | Comando `doctor` | v0-13, v0-16, v0-17 | [#19](https://github.com/CaDelTo/atium/issues/19) |
| [v0-19-v0-acceptance](v0-19-v0-acceptance.md) | Aceptación de V0 | todas las anteriores | [#20](https://github.com/CaDelTo/atium/issues/20) |

Orden sugerido:

```
v0-01 → v0-02 → v0-03 → v0-04

v0-02 → v0-05 → v0-06 → v0-07
                     ├→ v0-08
                     └→ v0-09

v0-05 → v0-10 → v0-11 → v0-12 → v0-13 → v0-14 → v0-15 → v0-16
                           └→ v0-17

v0-13 + v0-16 + v0-17 → v0-18 → v0-19
```

v0-07, v0-08 y v0-09 se pueden hacer en paralelo (por ejemplo, en worktrees de Git separados).

### V1 — Linter (pendiente de detallar)

Del `/audit` de cierre de V0 (#20). Sin issue todavía; `/plan-phase v1` los crea junto con los del linter:

| Tarea | Título | Depende de | Issue |
|---|---|---|---|
| [v1-01-dependency-security-bump](v1-01-dependency-security-bump.md) | Actualizar dependencias con avisos de seguridad | ninguna | — |
| [v1-02-shared-fs-and-path-helpers](v1-02-shared-fs-and-path-helpers.md) | Helpers compartidos de errores de archivo y rutas | ninguna | — |
| [v1-03-run-file-defaults](v1-03-run-file-defaults.md) | Valores de los archivos de run en `defaults.ts` | ninguna | — |
| [v1-04-run-context-robustness](v1-04-run-context-robustness.md) | Robustez de `detectRunContext` | ninguna | — |
| [v1-05-design-alignment](v1-05-design-alignment.md) | Alinear el diseño con lo implementado en V0 | ninguna | — |
| [v1-06-core-api-docs](v1-06-core-api-docs.md) | Documentación de la API de core | ninguna | — |

El resto se detalla al cerrar V0, para incorporar lo aprendido:

- Esqueleto de `@atium/eslint-plugin`, `RuleTester` y plantilla de página de documentación por regla
- Reglas por archivo, una por tarea: E2E010, E2E001, E2E002, E2E003, E2E004, E2E009, E2E005, E2E006, E2E012
- Presets `recommended` y `strict` con tabla de equivalencias
- Repo demo `examples/playwright-demo` con problemas sembrados y `expected-findings.json`
- `suite-index` (índice cross-file)
- Reglas cross-file, una por tarea: E2E006b, E2E007, E2E008, E2E011, E2E013
- Fingerprint de hallazgos de lint y baseline
- Reporters de consola, JSON y SARIF
- Comando `atium lint`
- Aceptación de V1
