# Carrera al migrar una base SQLite nueva

- ID: v1-46-sqlite-migration-race
- Fase: V1
- Paquete: packages/storage/sqlite
- Depende de: ninguna
- Origen: auditoría del repositorio del 2026-11-06, hallazgo 1

## Contexto

Diseño: docs/design/15-storage.md §23
ADRs: 0006 (fail-open), 0007
Estándares: docs/engineering/04-testing.md, 05-errors.md

- `openSqliteStorage` llama a `migrate` de drizzle (`sqlite-storage.ts:100`). Drizzle lee la última migración aplicada fuera de su transacción (`drizzle-orm/sqlite-core/dialect.js:652-657`), y `drizzle/0000_initial.sql` usa `CREATE TABLE` sin `IF NOT EXISTS`.
- Si dos procesos (por ejemplo, dos shards de CI) abren a la vez un `.atium/atium.db` que no existe, los dos ven la base sin migrar. El segundo falla con "table already exists" y `openSqliteStorage` devuelve `STORAGE_UNAVAILABLE`. Por fail-open, ese proceso no guarda su ejecución y nadie se entera.

## Hacer

- Escribir primero un test que abra dos o más conexiones a la vez sobre un archivo nuevo y falle hoy.
- Hacer que la apertura concurrente de una base nueva termine bien en todos los procesos. La opción más pequeña: si `migrate` falla, reintentarlo una vez, porque el segundo intento ve la migración aplicada.
- Si el reintento no basta (por ejemplo, la tabla de migraciones queda a medias), proponer otra opción en el plan.

## Criterios de aceptación

- Un test abre al menos dos conexiones `openSqliteStorage` a la vez sobre un archivo que no existe, y todas devuelven `ok`.
- El test falla sin el arreglo.
- Una migración que falla por otra causa sigue devolviendo `STORAGE_UNAVAILABLE`.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes
- `delivery-auditor` aprueba la entrega

## Fuera de alcance

- Cambiar de herramienta de migraciones.
- Migraciones nuevas del esquema.
