# Builders de datos de prueba

- ID: v0-07-test-builders
- Fase: V0
- Paquete: packages/core/src/testing
- Depende de: v0-06

## Contexto

- Estándares: docs/engineering/04-testing.md (Datos de prueba)
- Diseño: docs/design/02-data-model.md §9.2

## Hacer

- Builders fluidos e inmutables: `aRun`, `aTestCase`, `aTestResult`, `anAttempt`, `anError`.
- Atajos de comportamiento: `.passed()`, `.failedThenPassed()`, `.failedAllAttempts(n)`, `.onCommit(sha)`, `.onProvider(name)`.
- Valores por defecto deterministas: fechas fijas e IDs derivados de una semilla, nunca aleatorios.
- Exportados desde `@atium/core/testing`.

## Criterios de aceptación

- Todo objeto construido con valores por defecto pasa el esquema Zod correspondiente.
- Llamar a un método del builder no modifica builders anteriores (test de inmutabilidad).
- Dos ejecuciones producen exactamente los mismos objetos.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes

## Fuera de alcance

- Historiales sintéticos para flaky (V3).
