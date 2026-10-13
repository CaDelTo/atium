# Robustez de `detectRunContext`

- ID: v1-04-run-context-robustness
- Fase: V1
- Paquete: packages/core/src/ci
- Depende de: ninguna
- Origen: `/audit` de cierre de V0 (#20) y handoff de #19

## Contexto

- Diseño: docs/design/02-data-model.md §10.1
- ADRs: 0006 (fail-open)
- Antecedente: el commit 518c2b2 hizo secuenciales las consultas de Git en `atium doctor` porque, en Windows, procesos `git` que seguían vivos bloqueaban el directorio.

## Hacer

- `detect-run-context.ts:128` lanza `headCommit`, `currentBranch` e `isDirty` con `Promise.all`. Si `headCommit` falla, los otros procesos siguen vivos. El check `ci` de `doctor` llama a `detectRunContext`, así que el problema sigue ahí. Hacer las consultas en serie, como `checkGit`.
- `headSha` del payload de GitHub: `github-event.ts:23` no lo limita, y uno por encima del tope de bytes del modelo hace que `detectRunContext` lance `MODEL_INVALID` (`detect-run-context.ts:83`). §10.1 paso 3 pide un aviso para un `pull_request` inválido, pero los casos límite de §10.1 dicen que un valor que no cabe da `MODEL_INVALID`. Resolver la contradicción en el diseño y ajustar el código.

## Decisiones abiertas en esta tarea

- Si un `headSha` que no cabe es un aviso (y se omite) o `MODEL_INVALID`.

## Criterios de aceptación

- Test que, con un `GitClient` falso que registra las llamadas, comprueba que no se lanza una consulta antes de que termine la anterior y que no se lanza ninguna después de un fallo.
- Test del `headSha` demasiado largo con el comportamiento decidido.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes

## Fuera de alcance

- Proveedores de CI nuevos.
