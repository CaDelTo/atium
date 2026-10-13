# Valores de los archivos de run en `defaults.ts`

- ID: v1-03-run-file-defaults
- Fase: V1
- Paquete: packages/core/src/storage, packages/core/src/redact
- Depende de: ninguna
- Origen: `/audit` de cierre de V0 (#20)

## Contexto

- Diseño: docs/design/15-storage.md §23, docs/design/20-security-privacy.md
- ADRs: 0007, 0018
- Estándares: Definition of Done "sin valores mágicos" (docs/engineering/README.md)

## Hacer

- Mover `RUN_FILE_MODE = 0o600` (`run-file-writer.ts:24`) a `packages/core/src/defaults.ts`, con la cita a 15-storage.md, como hace sqlite con `SQLITE_FILE_MODE`.
- `rm(..., { maxRetries: 3 })` (`run-file-writer.ts:39`): el diseño no define el número de reintentos. Proponerlo en el plan, escribirlo en 15-storage.md y llevarlo a `defaults.ts`.
- `mkdir` de `.atium/runs/` (`run-file-writer.ts:106`) no fija `mode`. Si el escritor de runs crea `.atium/` antes que SQLite, queda con el umask y no con 0700 como en 15-storage.md:136. Proponer en el plan si los directorios de runs usan 0700.
- `REDACT_PATTERN_IDS` (`redact/patterns.ts:7`) repite la lista de `REDACT_DEFAULTS` (`defaults.ts:122`). Derivar una de la otra.

## Decisiones abiertas en esta tarea

- Número de reintentos del borrado temporal y modo de los directorios de runs: el diseño no los define. Preguntar antes de fijarlos.

## Criterios de aceptación

- Ningún literal de permisos ni de reintentos fuera de `defaults.ts` en `packages/core/src/storage`.
- Test del modo de `.atium/runs/` en POSIX si se decide 0700.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes

## Fuera de alcance

- Cambiar el formato de los archivos de run (ADR-0018).
