# Interfaces de storage, contrato y fake en memoria

- ID: v0-15-storage-contract
- Fase: V0
- Paquete: packages/core
- Depende de: v0-14

## Contexto

- Diseño: docs/design/15-storage.md §23
- ADRs: 0007
- Estándares: 02-code-design.md (segregación de interfaces), 04-testing.md (tests de contrato, fakes)

## Hacer

- Interfaces `StorageReader` y `StorageWriter` mínimas para V0: `writeRun`, `getRun`, `listRuns({ branch?, since?, limit })`, `close`.
- Operaciones que pueden fallar de forma esperada devuelven `Result`.
- `InMemoryStorage` como fake.
- Suite de contrato en `packages/core/test-contracts/storage.contract.ts`.

## Criterios de aceptación

- El fake pasa la suite de contrato.
- La suite cubre: lectura igual a escritura, orden de `listRuns` por fecha, filtros, run inexistente, escrituras concurrentes sin pérdida.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes

## Fuera de alcance

- Compactación, rollups, stats y backends remotos (V4).
