# Pistas de error de storage y ejecuciones ilegibles en listRuns

- ID: v1-50-storage-error-hints
- Fase: V1
- Paquete: packages/storage/sqlite, packages/core (contrato de storage)
- Depende de: ninguna
- Origen: auditoría del repositorio del 2026-11-06, hallazgo 5

## Contexto

Diseño: docs/design/15-storage.md
ADRs: 0006 (fail-open), 0007
Estándares: docs/engineering/05-errors.md

- `unavailable` (`sqlite-storage.ts:246-251`) da la misma pista a todo error de SQLite: "Deleting the file starts a new, empty history". También cuando la base solo está bloqueada (`SQLITE_BUSY` o `SQLITE_LOCKED` después del `busy_timeout` de 5 s).
- `#list` (`sqlite-storage.ts:190-200`) devuelve el primer error y descarta las demás ejecuciones: una sola ejecución ilegible (por ejemplo, escrita por una versión más nueva) hace fallar todo `listRuns`.
- El contrato (`test-contracts/storage.contract.ts`) documenta hoy ese comportamiento de `listRuns`.

## Hacer

- Dar una pista propia a `SQLITE_BUSY` y `SQLITE_LOCKED` que no sugiera borrar el archivo.
- Proponer en el plan, y en el diseño si se acepta, que `listRuns` salte las ejecuciones ilegibles con un aviso en el logger en lugar de fallar. Es un cambio del contrato: detenerse hasta que una persona lo apruebe.

## Criterios de aceptación

- Un error `SQLITE_BUSY` produce un `AtiumError` cuya pista no menciona borrar el archivo.
- Si se aprueba el cambio de contrato: con una ejecución ilegible y dos válidas, `listRuns` devuelve las dos válidas y registra un aviso; el contrato y `docs/design/15-storage.md` lo describen.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes
- `delivery-auditor` aprueba la entrega

## Fuera de alcance

- Reintentos automáticos de escritura.
- `getRun` sobre una ejecución ilegible (ya cubierto).
