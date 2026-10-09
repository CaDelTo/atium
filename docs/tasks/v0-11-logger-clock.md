# Logger y reloj

- ID: v0-11-logger-clock
- Fase: V0
- Paquete: packages/core
- Depende de: v0-10

## Contexto

- Estándares: 03-errors-logging.md (Logging, Salida del CLI), 02-code-design.md (determinismo)
- Diseño: docs/design/18-cli-config.md §26 (`--verbose`, `NO_COLOR`, `DEBUG=atium:*`)

## Hacer

- Implementación de `Logger` con niveles, contexto estructurado y salida a stderr.
- Redacción aplicada a mensaje y contexto antes de escribir.
- Activación de debug con `DEBUG=atium:*` o una opción `verbose`.
- Sin colores con `NO_COLOR` o cuando stderr no es una terminal.
- Interfaz `Clock` con `systemClock` y `fixedClock(ms)` para tests.

## Criterios de aceptación

- Tests con un stream falso: niveles filtrados, contexto serializado, secretos redactados, sin códigos de color con `NO_COLOR`.
- Ningún `console.*` en el código del paquete.
- `pnpm verify` pasa
- `/review` sin hallazgos bloqueantes

## Fuera de alcance

- Formato de salida de resultados del CLI (v0-17).
