# Código de salida del CLI ante EPIPE y errores fuera de run

- ID: v1-54-cli-exit-epipe
- Fase: V1
- Paquete: packages/cli
- Depende de: ninguna
- Origen: auditoría del repositorio del 2026-11-06, hallazgo 9

## Contexto

Diseño: docs/design/18-cli-config.md (códigos de salida)
ADRs: 0006 (fail-open)
Estándares: docs/engineering/05-errors.md

- `run()` (`run.ts:40`) llama a `createProgram()` fuera del `try`.
- `bin.ts` no escucha errores de `process.stdout`. Con `atium doctor --format json | head -1`, el EPIPE terminaría el proceso con el código 1 de Node, que CI lee como gate fallido. No se reprodujo en la auditoría.

## Hacer

- Reproducir primero el EPIPE con un test que ejecute el binario con la salida conectada a un proceso que se cierra pronto.
- Mover `createProgram()` dentro del `try`.
- En `bin.ts`, ignorar `EPIPE` en `process.stdout` y `process.stderr`, y llevar cualquier otro error no capturado a la salida de error interno.

## Criterios de aceptación

- Con la salida cerrada antes de terminar, `atium doctor --format json` sale con 0 sin `--strict`.
- Un error al construir el programa sale con el código de error interno, no con 1.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes
- `delivery-auditor` aprueba la entrega

## Fuera de alcance

- Cambiar los códigos de salida definidos en el diseño.
