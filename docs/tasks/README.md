# Tareas

Cada tarea es un archivo `docs/tasks/<fase>-<nn>-<nombre>.md` (por ejemplo `v0-03-model.md`) y se inicia en Claude Code con `/task docs/tasks/<archivo>`.

Una tarea debe poder completarse en una sesión y en un PR de menos de 400 líneas.

## Plantilla

```markdown
# <Título>

- Fase: V0
- Paquete: packages/core
- Depende de: v0-02-config (o "ninguna")

## Contexto

Diseño: docs/design/XX-*.md §N
ADRs: 0003, 0004
Estándares: docs/engineering/01-typescript.md, 04-testing.md

## Hacer

- ...

## Criterios de aceptación

- ...
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes

## Fuera de alcance

- ...
```

## Estado

Al cerrar una tarea, cambia su estado aquí en el mismo PR. Estados: Pendiente, En curso, Hecha, Bloqueada.

### V0 — Fundaciones

Criterio de la fase: docs/design/22-roadmap.md §30.

| Tarea | Título | Depende de | Estado |
|---|---|---|---|
| [v0-01-monorepo-bootstrap](v0-01-monorepo-bootstrap.md) | Bootstrap del monorepo | ninguna | Hecha |
| [v0-02-core-skeleton](v0-02-core-skeleton.md) | Esqueleto del paquete core | v0-01 | Hecha |
| [v0-03-quality-tooling](v0-03-quality-tooling.md) | Herramientas de calidad y `pnpm verify` | v0-02 | Hecha |
| [v0-04-ci-pipeline](v0-04-ci-pipeline.md) | Pipeline de CI y plantillas del repositorio | v0-03 | Pendiente |
| [v0-05-errors-result-failopen](v0-05-errors-result-failopen.md) | Errores, `Result` y `failOpen` | v0-02 | Pendiente |
| [v0-06-model-schemas](v0-06-model-schemas.md) | Esquemas Zod del modelo de datos | v0-05 | Pendiente |
| [v0-07-test-builders](v0-07-test-builders.md) | Builders de datos de prueba | v0-06 | Pendiente |
| [v0-08-identity-and-paths](v0-08-identity-and-paths.md) | Identidad de tests y rutas | v0-06 | Pendiente |
| [v0-09-finding-model](v0-09-finding-model.md) | Modelo de Finding y orden determinista | v0-06 | Pendiente |
| [v0-10-redaction](v0-10-redaction.md) | Redacción de datos sensibles | v0-05 | Pendiente |
| [v0-11-logger-clock](v0-11-logger-clock.md) | Logger y reloj | v0-10 | Pendiente |
| [v0-12-config](v0-12-config.md) | Configuración: esquema, carga y precedencia | v0-11 | Pendiente |
| [v0-13-ci-context](v0-13-ci-context.md) | Detección de contexto de git y CI | v0-12 | Pendiente |
| [v0-14-run-files](v0-14-run-files.md) | Archivos de run (`.ndjson.gz`) | v0-13 | Pendiente |
| [v0-15-storage-contract](v0-15-storage-contract.md) | Interfaces de storage, contrato y fake en memoria | v0-14 | Pendiente |
| [v0-16-storage-sqlite](v0-16-storage-sqlite.md) | Backend SQLite | v0-15 | Pendiente |
| [v0-17-cli-skeleton](v0-17-cli-skeleton.md) | CLI base e `init` | v0-12 | Pendiente |
| [v0-18-doctor](v0-18-doctor.md) | Comando `doctor` | v0-13, v0-16, v0-17 | Pendiente |
| [v0-19-v0-acceptance](v0-19-v0-acceptance.md) | Aceptación de V0 | todas las anteriores | Pendiente |

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

Se detallan al cerrar V0, para incorporar lo aprendido:

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
