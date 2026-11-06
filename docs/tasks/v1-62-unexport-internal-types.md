# Tipos internos exportados sin uso

- ID: v1-62-unexport-internal-types
- Fase: V1
- Paquete: packages/storage/sqlite, packages/core (storage)
- Depende de: ninguna
- Origen: auditoría del repositorio del 2026-11-06, hallazgo 17

## Contexto

Diseño: ninguno
ADRs: ninguno
Estándares: docs/engineering/07-public-api.md

- `TestResultRow` y `AttemptRow` (`packages/storage/sqlite/src/run-rows.ts`) se exportan pero solo se usan dentro de ese archivo.
- `LineSizes` y `FittedLine` (`packages/core/src/storage/fit-line.ts`) se exportan pero solo se usan dentro de ese archivo.
- Ninguno de los cuatro sale por el `index.ts` de su paquete, así que no son API pública.

## Hacer

- Quitar `export` de los cuatro tipos.

## Criterios de aceptación

- Ninguno de los cuatro tipos se exporta de su archivo.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes
- `delivery-auditor` aprueba la entrega

## Fuera de alcance

- Otros exports sin uso (los detecta `knip` en `pnpm verify`).
