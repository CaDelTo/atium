# Tests de concurrencia reales en el storage

- ID: v1-53-storage-contract-concurrency
- Fase: V1
- Paquete: packages/core (test-contracts), packages/storage/sqlite
- Depende de: ninguna
- Origen: auditoría del repositorio del 2026-11-06, hallazgo 8

## Contexto

Diseño: docs/design/15-storage.md
ADRs: 0007
Estándares: docs/engineering/04-testing.md

- Los tests de concurrencia del contrato (`storage.contract.ts:243-274`) usan `Promise.all` sobre llamadas síncronas a una sola conexión, así que se ejecutan una tras otra.
- Si se quita `.immediate` de `writeRun`, todos los tests siguen pasando. Con dos conexiones, dos escrituras del mismo id pasarían las dos la comprobación de existencia y una terminaría en `STORAGE_UNAVAILABLE` en lugar de `STORAGE_CONFLICT`.

## Hacer

- Agregar en `packages/storage/sqlite` un test con varias conexiones `openSqliteStorage` sobre el mismo archivo que escriban a la vez el mismo id y ids distintos.
- Decidir en el plan si la prueba con varias conexiones entra en el contrato (opción del factory) o queda en los tests de SQLite.

## Criterios de aceptación

- Con varias conexiones escribiendo el mismo id, una devuelve `ok` y las demás `STORAGE_CONFLICT`.
- Con varias conexiones escribiendo ids distintos, todas devuelven `ok` y `listRuns` las devuelve todas.
- El test falla si `writeRun` usa una transacción diferida en lugar de `.immediate`.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes
- `delivery-auditor` aprueba la entrega

## Fuera de alcance

- La carrera de la primera migración (v1-46).
