# Timeout en las llamadas a git

- ID: v1-51-git-timeout
- Fase: V1
- Paquete: packages/core (ci)
- Depende de: ninguna
- Origen: auditoría del repositorio del 2026-11-06, hallazgo 6

## Contexto

Diseño: docs/design/02-data-model.md (detección del contexto de la ejecución)
ADRs: 0006 (fail-open)
Estándares: docs/engineering/05-errors.md

- `createGitClient` (`ci/git-client.ts:54-64`) crea `simpleGit({ baseDir })` sin `timeout`, y `ci/env-ci-fallback.ts:56` ejecuta git de forma síncrona sin timeout.
- Con un repo enorme o un disco de red colgado, `git status --porcelain` bloquea `detectRunContext` hasta que CI mata el job.

## Hacer

- Pasar un timeout a todas las llamadas a git de `packages/core/src/ci/`.
- Tratar el timeout como cualquier otro fallo de git: el dato queda sin valor y la ejecución sigue (fail-open).
- Poner el valor en `defaults.ts` y en el diseño.

## Decisiones abiertas en esta tarea

- El valor del timeout: el diseño no lo define (propuesta: 10 s).

## Criterios de aceptación

- Un test con un cliente de git que no responde muestra que `detectRunContext` termina dentro del timeout y sin datos de git.
- El valor del timeout está en `defaults.ts` y en el diseño.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes
- `delivery-auditor` aprueba la entrega

## Fuera de alcance

- Cambiar los comandos de git que se ejecutan.
