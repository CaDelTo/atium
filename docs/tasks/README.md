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

### V1 — Linter

Criterio de la fase: docs/design/22-roadmap.md §30. v1-01 a v1-06 salen del `/audit` de cierre de V0 (#20).

| Tarea | Título | Depende de | Issue |
|---|---|---|---|
| [v1-01-dependency-security-bump](v1-01-dependency-security-bump.md) | Actualizar dependencias con avisos de seguridad | ninguna | [#41](https://github.com/CaDelTo/atium/issues/41) |
| [v1-02-shared-fs-and-path-helpers](v1-02-shared-fs-and-path-helpers.md) | Helpers compartidos de errores de archivo y rutas | ninguna | [#42](https://github.com/CaDelTo/atium/issues/42) |
| [v1-03-run-file-defaults](v1-03-run-file-defaults.md) | Valores de los archivos de run en `defaults.ts` | ninguna | [#43](https://github.com/CaDelTo/atium/issues/43) |
| [v1-04-run-context-robustness](v1-04-run-context-robustness.md) | Robustez de `detectRunContext` | ninguna | [#44](https://github.com/CaDelTo/atium/issues/44) |
| [v1-05-design-alignment](v1-05-design-alignment.md) | Alinear el diseño con lo implementado en V0 | ninguna | [#45](https://github.com/CaDelTo/atium/issues/45) |
| [v1-06-core-api-docs](v1-06-core-api-docs.md) | Documentación de la API de core | ninguna | [#46](https://github.com/CaDelTo/atium/issues/46) |
| [v1-07-linter-architecture](v1-07-linter-architecture.md) | Decisiones de arquitectura del linter | ninguna | [#47](https://github.com/CaDelTo/atium/issues/47) |
| [v1-08-eslint-plugin-skeleton](v1-08-eslint-plugin-skeleton.md) | Esqueleto de `@atium/eslint-plugin` | v1-07 | [#48](https://github.com/CaDelTo/atium/issues/48) |
| [v1-09-e2e-syntax](v1-09-e2e-syntax.md) | Reconocimiento de tests, acciones y assertions | v1-08 | [#49](https://github.com/CaDelTo/atium/issues/49) |
| [v1-10-selector-parsing](v1-10-selector-parsing.md) | Análisis y clasificación de selectores | v1-08 | [#50](https://github.com/CaDelTo/atium/issues/50) |
| [v1-11-rule-e2e010-only](v1-11-rule-e2e010-only.md) | Regla E2E010: `.only` olvidado | v1-09 | [#51](https://github.com/CaDelTo/atium/issues/51) |
| [v1-12-rule-e2e001-hard-wait](v1-12-rule-e2e001-hard-wait.md) | Regla E2E001: hard waits | v1-09 | [#52](https://github.com/CaDelTo/atium/issues/52) |
| [v1-13-rule-e2e002-fragile-css](v1-13-rule-e2e002-fragile-css.md) | Regla E2E002: selector CSS frágil | v1-09, v1-10 | [#53](https://github.com/CaDelTo/atium/issues/53) |
| [v1-14-rule-e2e003-positional-xpath](v1-14-rule-e2e003-positional-xpath.md) | Regla E2E003: XPath posicional | v1-09, v1-10 | [#54](https://github.com/CaDelTo/atium/issues/54) |
| [v1-15-rule-e2e004-nth](v1-15-rule-e2e004-nth.md) | Regla E2E004: uso de `.nth()` | v1-09 | [#55](https://github.com/CaDelTo/atium/issues/55) |
| [v1-16-rule-e2e009-web-first](v1-16-rule-e2e009-web-first.md) | Regla E2E009: assertions no web-first | v1-09 | [#56](https://github.com/CaDelTo/atium/issues/56) |
| [v1-17-rule-e2e005-test-size](v1-17-rule-e2e005-test-size.md) | Regla E2E005: test demasiado grande | v1-09 | [#57](https://github.com/CaDelTo/atium/issues/57) |
| [v1-18-rule-e2e006-assertions](v1-18-rule-e2e006-assertions.md) | Regla E2E006: assertions insuficientes | v1-09 | [#58](https://github.com/CaDelTo/atium/issues/58) |
| [v1-19-rule-e2e012-secrets](v1-19-rule-e2e012-secrets.md) | Regla E2E012: secretos en tests | v1-08 | [#59](https://github.com/CaDelTo/atium/issues/59) |
| [v1-20-presets](v1-20-presets.md) | Presets `recommended` y `strict` | v1-11, v1-12, v1-13, v1-14, v1-15, v1-16, v1-17, v1-18, v1-19 | [#60](https://github.com/CaDelTo/atium/issues/60) |
| [v1-21-playwright-demo](v1-21-playwright-demo.md) | Repo demo con problemas sembrados | v1-07 | [#61](https://github.com/CaDelTo/atium/issues/61) |
| [v1-22-lint-fingerprint](v1-22-lint-fingerprint.md) | Fingerprint de hallazgos de lint | v1-07 | [#62](https://github.com/CaDelTo/atium/issues/62) |
| [v1-23-analyzer-pipeline](v1-23-analyzer-pipeline.md) | Interfaz `Analyzer` y orquestador | v1-07 | [#63](https://github.com/CaDelTo/atium/issues/63) |
| [v1-24-report-model](v1-24-report-model.md) | Modelo del reporte e interfaz `Reporter` | v1-07 | [#64](https://github.com/CaDelTo/atium/issues/64) |
| [v1-25-reporter-console](v1-25-reporter-console.md) | Reporter de consola | v1-24 | [#65](https://github.com/CaDelTo/atium/issues/65) |
| [v1-26-reporter-json](v1-26-reporter-json.md) | Reporter JSON | v1-24 | [#66](https://github.com/CaDelTo/atium/issues/66) |
| [v1-27-reporter-sarif](v1-27-reporter-sarif.md) | Reporter SARIF 2.1.0 | v1-24 | [#67](https://github.com/CaDelTo/atium/issues/67) |
| [v1-28-baseline-core](v1-28-baseline-core.md) | Formato y comparación del baseline | v1-22 | [#68](https://github.com/CaDelTo/atium/issues/68) |
| [v1-29-suite-index-file](v1-29-suite-index-file.md) | Índice de la suite: extracción por archivo | v1-09, v1-10 | [#69](https://github.com/CaDelTo/atium/issues/69) |
| [v1-30-suite-index-build](v1-30-suite-index-build.md) | Índice de la suite: construcción y resolución entre archivos | v1-29 | [#70](https://github.com/CaDelTo/atium/issues/70) |
| [v1-31-suite-index-cache](v1-31-suite-index-cache.md) | Caché del índice de la suite | v1-30 | [#71](https://github.com/CaDelTo/atium/issues/71) |
| [v1-32-crossfile-e2e007](v1-32-crossfile-e2e007.md) | Regla cross-file E2E007: analizador `lint-crossfile` y selector repetido | v1-23, v1-30 | [#72](https://github.com/CaDelTo/atium/issues/72) |
| [v1-33-crossfile-e2e006b](v1-33-crossfile-e2e006b.md) | Regla cross-file E2E006b: assertions insuficientes con resolución completa | v1-18, v1-32 | [#73](https://github.com/CaDelTo/atium/issues/73) |
| [v1-34-crossfile-e2e008](v1-34-crossfile-e2e008.md) | Regla cross-file E2E008: dependencia entre tests | v1-32 | [#74](https://github.com/CaDelTo/atium/issues/74) |
| [v1-35-crossfile-e2e011](v1-35-crossfile-e2e011.md) | Regla cross-file E2E011: código de test sin usar | v1-32 | [#75](https://github.com/CaDelTo/atium/issues/75) |
| [v1-36-crossfile-e2e013](v1-36-crossfile-e2e013.md) | Regla cross-file E2E013: tests casi duplicados | v1-32 | [#76](https://github.com/CaDelTo/atium/issues/76) |
| [v1-37-cli-lint](v1-37-cli-lint.md) | Comando `atium lint` (reglas por archivo) | v1-20, v1-22, v1-25, v1-26, v1-27, v1-29 | [#77](https://github.com/CaDelTo/atium/issues/77) |
| [v1-38-cli-lint-crossfile](v1-38-cli-lint-crossfile.md) | `atium lint`: reglas cross-file y baseline | v1-21, v1-28, v1-32, v1-33, v1-34, v1-35, v1-36, v1-37 | [#78](https://github.com/CaDelTo/atium/issues/78) |
| [v1-39-cli-baseline](v1-39-cli-baseline.md) | Comando `atium baseline` | v1-38 | [#79](https://github.com/CaDelTo/atium/issues/79) |
| [v1-40-lint-cache-bench](v1-40-lint-cache-bench.md) | Caché de ESLint y benchmark de 1,000 archivos | v1-31, v1-38 | [#80](https://github.com/CaDelTo/atium/issues/80) |
| [v1-41-pr-annotations](v1-41-pr-annotations.md) | Anotaciones de lint en PRs de GitHub | v1-21, v1-38 | [#81](https://github.com/CaDelTo/atium/issues/81) |
| [v1-42-v1-acceptance](v1-42-v1-acceptance.md) | Aceptación de V1 | todas las anteriores | [#82](https://github.com/CaDelTo/atium/issues/82) |

Orden sugerido:

```
v1-01 … v1-06                     independientes del resto

v1-07 → v1-08 → v1-09 → v1-11, v1-12, v1-15, v1-16, v1-17, v1-18
             │       └→ v1-13, v1-14 (con v1-10)
             ├→ v1-10
             └→ v1-19
        v1-11 … v1-19 → v1-20

v1-07 → v1-21
      → v1-22 → v1-28
      → v1-23
      → v1-24 → v1-25, v1-26, v1-27

v1-09 + v1-10 → v1-29 → v1-30 → v1-31
v1-23 + v1-30 → v1-32 → v1-33 (con v1-18), v1-34, v1-35, v1-36

v1-20 + v1-22 + v1-25…v1-27 + v1-29 → v1-37
v1-21 + v1-28 + v1-32…v1-37 → v1-38 → v1-39
                                      → v1-40 (con v1-31)
                                      → v1-41
todas → v1-42
```

Se pueden hacer en paralelo (`/parallel`): v1-01 a v1-07; v1-09 y v1-10; las reglas v1-11 a v1-19; v1-21 a v1-24; los reporters v1-25 a v1-27; las reglas cross-file v1-33 a v1-36; y v1-39 a v1-41.

v1-07 concentra las decisiones de arquitectura (capas, catálogo de reglas, documentación de reglas, cómo funciona `atium lint` y contexto de los analizadores) y bloquea casi todo lo demás. v1-41 depende de una decisión del usuario: el repo es privado y las anotaciones SARIF requieren GitHub Advanced Security o un repo público.
