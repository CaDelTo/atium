# Backend SQLite

- ID: v0-16-storage-sqlite
- Fase: V0
- Paquete: packages/storage/sqlite
- Depende de: v0-15

## Contexto

- Diseño: docs/design/15-storage.md §23.6
- Estándares: 05-performance.md (SQLite), 06-security.md (`allowBuilds`)

## Hacer

- Paquete `@atium/storage-sqlite` con better-sqlite3 y Drizzle.
- Tablas necesarias en V0: `runs`, `test_cases`, `test_results`, `attempts`, `errors`, con sus índices de §23.6. El resto llega con migraciones en sus fases.
- Migraciones con Drizzle; se aplican al abrir la base.
- Modo WAL, inserciones en una transacción, sentencias preparadas.
- Base en `.atium/atium.db`.
- Agregar `better-sqlite3: true` a `allowBuilds` en `pnpm-workspace.yaml`.

## Criterios de aceptación

- Pasa la suite de contrato de storage.
- Funciona en Linux, macOS y Windows en CI.
- Escribir un run de 1,000 tests toma menos de 1 s (benchmark).
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes

## Fuera de alcance

- Tablas de red, rollups y findings (fases posteriores).
