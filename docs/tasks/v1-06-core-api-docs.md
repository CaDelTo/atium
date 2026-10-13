# Documentación de la API de core

- ID: v1-06-core-api-docs
- Fase: V1
- Paquete: packages/core
- Depende de: ninguna
- Origen: `/audit` de cierre de V0 (#20)

## Contexto

- Estándares: docs/engineering/07-public-api.md, Definition of Done (docs/engineering/README.md)

## Hacer

- TSDoc en los miembros de los esquemas públicos que no lo tienen:
  - `FindingSchema` (`findings/finding.ts:64-68`): `severity`, `category`, `source`, `confidence` y `message`. Es la interfaz que usan los plugins.
  - `RunSchema` (`model/run.ts`): `schemaVersion`, `id`, `git`, `ci`, `environment`, `frameworkConfig`, `startedAt`, `finishedAt` y `results`.
  - `test-result.ts` (`test`, `outcome`), `attempt.ts` (`status`, `startedAt`, `durationMs`) y `error-occurrence.ts` (`message`, `stack`).
- README de core: la lista "Today it provides" no incluye `SCHEMA_VERSION`, `FRAMEWORK_NAMES`/`FrameworkName`, `TEST_OUTCOMES`/`TestOutcome` ni `ATTEMPT_STATUSES`/`AttemptStatus`. Completarla y, en la sección de testing, nombrar los tipos exportados de los builders y fakes.
- `@packageDocumentation` en `src/index.ts` y en `test-contracts/storage.contract.ts`, como en `testing/index.ts`.
- `tsup.config.ts:7-11` genera CJS también para `test-contracts`, que `exports` solo expone como ESM (07-public-api.md:20). Limitar esa entrada a ESM.

## Criterios de aceptación

- Todo exportado de core, y cada miembro de sus esquemas públicos, tiene TSDoc.
- El README lista exactamente las exportaciones de `src/index.ts`.
- `pkg:check` pasa y `dist/` ya no tiene CJS de `test-contracts`.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes

## Fuera de alcance

- Cambiar las exportaciones.
