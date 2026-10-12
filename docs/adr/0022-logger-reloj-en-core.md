# ADR-0022: Logger y reloj implementados en core, y `DEBUG` leído sin el paquete debug

- Estado: Aceptada
- Fecha: 2026-10-12
- Diseño relacionado: 17-tech-stack.md, 18-cli-config.md §26; 02-code-design.md y 03-errors-logging.md (estándares)

## Contexto

La tarea v0-11 pide implementar en `packages/core` un `Logger` (niveles, contexto estructurado, salida a stderr, redacción, depuración con `DEBUG=atium:*` o `--verbose`, sin colores con `NO_COLOR` o fuera de una terminal) y un `Clock` con `systemClock` y `fixedClock(ms)`.

Dos documentos chocaban con eso:

- `02-code-design.md`, tabla SOLID, decía: "`core` define interfaces (`StorageReader`, `Logger`, `Clock`); las implementaciones viven en otros paquetes". Pero el logger concreto lo necesitan los reporters, el fixture, storage y el CLI, y la tabla de capas solo deja depender de `core` a los reporters, el storage y los adapters. Si la implementación viviera en el CLI, los reporters, que corren dentro de la suite del usuario sin el CLI, no tendrían logger.
- `17-tech-stack.md` listaba el paquete `debug` para los logs de depuración. Ese paquete guarda estado global (`debug.enable`, lee `process.env` al importarse) y escribe por su cuenta en stderr. Eso choca con "sin estado global" (02-code-design.md), con la redacción antes de escribir (03-errors-logging.md) y con el stream inyectado que piden los tests de la tarea.

El usuario aprobó ambas desviaciones en el plan de v0-11 (#12).

## Decisión

- `@atium/core` exporta, además de las interfaces, `createStderrLogger` y `systemClock`. `fixedClock` vive en `@atium/core/testing`. Las demás interfaces de core (`StorageReader`, `StorageWriter`, etc.) siguen implementándose en otros paquetes.
- `createStderrLogger` recibe por parámetro el stream, el entorno, el redactor y el namespace. No lee `process.*` ni guarda estado a nivel de módulo.
- `DEBUG` se interpreta con código propio y la misma sintaxis que el paquete debug: patrones separados por comas o espacios, `*` como comodín y exclusiones con `-`, que ganan siempre. El paquete `debug` no se añade como dependencia.
- Los colores usan `picocolors` (ya listado) mediante `createColors(enabled)`, y la decisión de usar color se calcula con el stream y el entorno inyectados.

## Consecuencias

- Todos los paquetes que dependen de `core` tienen un logger concreto sin depender del CLI.
- `core` gana una dependencia de runtime, `picocolors`.
- El parser de `DEBUG` es código propio que hay que mantener. Es pequeño y no construye expresiones regulares a partir del entorno.
- Quien use el paquete debug en otros proyectos verá la misma sintaxis en `DEBUG`. No funcionan las extensiones del paquete, como `DEBUG_COLORS` o `DEBUG_DEPTH`.
- `02-code-design.md` y `17-tech-stack.md` se actualizaron en el mismo cambio que este ADR.
- PENDIENTE: `ATIUM_LOG_LEVEL` (18-cli-config.md §26.3) y `--quiet` no se resuelven aquí. Quedan para v0-12 (config) y v0-17 (CLI).

## Alternativas descartadas

- Implementación en el CLI: los reporters y el fixture no pueden depender del CLI (02-code-design.md, capas).
- Un paquete nuevo `@atium/logger`: añade un paquete y una capa por dos funciones pequeñas, y igual tendría que depender solo de `core`.
- Usar el paquete `debug`: estado global, salida directa a stderr sin redacción y sin stream inyectable.
- Usar el paquete `debug` solo para evaluar los patrones (`debug.enabled`): sigue leyendo el entorno global y añade una dependencia para una función de unas 40 líneas.
