# Hallazgos de analizadores sin spread

- ID: v1-57-analyzer-findings-spread
- Fase: V1
- Paquete: packages/core (pipeline)
- Depende de: ninguna
- Origen: auditoría del repositorio del 2026-11-06, hallazgo 12

## Contexto

Diseño: docs/design/14-architecture.md §22.1 y §22.2
ADRs: 0006 (fail-open), 0023
Estándares: docs/engineering/04-testing.md

- `runAnalyzers` junta los hallazgos con `findings.push(...validFindings(…))` (`pipeline/run-analyzers.ts:176`).
- Con unos 100.000 hallazgos o más de un analizador, el spread supera el límite de argumentos y lanza `RangeError`, así que `runAnalyzers` rechaza y rompe su promesa de no fallar nunca.

## Hacer

- Juntar los hallazgos sin spread (un `for` con `push`).
- Test con un analizador que devuelve 200.000 hallazgos.

## Criterios de aceptación

- `runAnalyzers` con un analizador que devuelve 200.000 hallazgos válidos termina y los devuelve todos.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes
- `delivery-auditor` aprueba la entrega

## Fuera de alcance

- Un tope de hallazgos por analizador.
