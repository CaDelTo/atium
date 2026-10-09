# Detección de contexto de git y CI

- ID: v0-13-ci-context
- Fase: V0
- Paquete: packages/core/src/ci
- Depende de: v0-12

## Contexto

- Diseño: docs/design/02-data-model.md §10, §9.4

## Hacer

- `detectRunContext({ env, cwd, git })` que devuelve las secciones `git` y `ci` del `Run`. `git` es una interfaz inyectada (implementación con simple-git).
- Proveedores de la tabla de §10: GitHub Actions, GitLab CI, Jenkins, CircleCI, Azure Pipelines y local. Usa env-ci y completa con reglas propias.
- GitHub PR: `commitSha` = `GITHUB_SHA` (merge commit); `headSha` y `prNumber` desde el payload de `GITHUB_EVENT_PATH`.
- Local: commit, rama y `dirty` desde Git.
- Overrides `ATIUM_COMMIT_SHA` y `ATIUM_BRANCH`.
- Sin Git disponible: error `GIT_UNAVAILABLE` con `hint`.

## Criterios de aceptación

- Un test por proveedor con variables de entorno de ejemplo.
- Test de PR de GitHub con un payload de evento de ejemplo.
- Tests de árbol `dirty`, overrides y Git ausente.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes

## Fuera de alcance

- Shards y re-runs como run lógico (V4).
