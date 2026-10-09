# Esqueleto del paquete core

- ID: v0-02-core-skeleton
- Fase: V0
- Paquete: packages/core
- Depende de: v0-01

## Contexto

- Diseño: docs/design/16-repository-structure.md §24
- ADRs: 0001, 0002, 0016
- Estándares: 01-typescript.md (imports y exports), 07-public-api.md (paquetes correctos), 09-documentation.md

## Hacer

- `packages/core/package.json`: nombre `@atium/core`, `"private": true` mientras el nombre sea provisional (ADR-0016), `type: module`, `exports` con `.` y `./testing` (import, require, types), `engines`, `files`.
- tsup con salida ESM + CJS y declaraciones de tipos.
- `tsconfig.json` que extiende `tsconfig.base.json`.
- `src/index.ts` como única entrada pública; `src/testing/index.ts` para `./testing`.
- Primer código real: `assertNever` (01-typescript.md) con TSDoc y su test.
- `vitest.config.ts` con umbrales de cobertura de 90% (04-testing.md).
- `README.md` del paquete (09-documentation.md).

## Criterios de aceptación

- `pnpm --filter @atium/core build` genera `dist/` con ESM, CJS y `.d.ts`.
- `pnpm --filter @atium/core test` pasa con cobertura sobre el umbral.
- Importar `@atium/core` desde ESM y desde CJS funciona (test de humo).
- `pnpm verify` todavía no existe (se crea en v0-03); deben pasar los comandos que ya existen
- `/review` sin hallazgos bloqueantes (los agentes omiten las herramientas que aún no están instaladas)

## Fuera de alcance

- Herramientas de lint y formato (v0-03); `publint`/`attw` se agregan con el resto de herramientas.
