# Rama completa en Azure Pipelines

- ID: v1-47-azure-branch-name
- Fase: V1
- Paquete: packages/core (ci)
- Depende de: ninguna
- Origen: auditoría del repositorio del 2026-11-06, hallazgo 2

## Contexto

Diseño: docs/design/02-data-model.md (tabla de proveedores de CI, línea de Azure Pipelines, y reglas de rama)
ADRs: ninguno
Estándares: docs/engineering/04-testing.md

- Fuera de un PR, `ci/providers.ts:117` lee la rama de `BUILD_SOURCEBRANCHNAME`, como indica la tabla del diseño.
- Azure solo pone ahí el último segmento del ref: `refs/heads/feature/login` se guarda como `login`, y `feature/login` y `hotfix/login` mezclan su historial.
- `BUILD_SOURCEBRANCH` tiene el ref completo (`refs/heads/feature/login`).
- El test actual (`detect-run-context.test.ts`) solo usa `main`.

## Hacer

- Actualizar el diseño: en Azure, fuera de un PR, la rama sale de `BUILD_SOURCEBRANCH` sin `refs/heads/`.
- Leer la rama con `withoutHeadsPrefix(envValue(env, "BUILD_SOURCEBRANCH"))` y conservar `SYSTEM_PULLREQUEST_SOURCEBRANCH` como primera opción en un PR.
- Decidir en el plan qué guardar cuando `BUILD_SOURCEBRANCH` es un tag (`refs/tags/...`).

## Criterios de aceptación

- Con `BUILD_SOURCEBRANCH=refs/heads/feature/login`, la rama detectada es `feature/login`.
- En un PR, la rama sigue saliendo de `SYSTEM_PULLREQUEST_SOURCEBRANCH`.
- `docs/design/02-data-model.md` describe la variable nueva.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes
- `delivery-auditor` aprueba la entrega

## Fuera de alcance

- Otros proveedores de CI (Jenkins guarda `origin/main` tal cual por decisión del diseño).
