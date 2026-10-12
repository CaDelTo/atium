# Errores y logging

## Dos tipos de fallo

| Tipo | Ejemplos | Manejo |
|---|---|---|
| Esperado | Config inválida, archivo ausente, storage no disponible, versión de framework no soportada | `AtiumError` con código, o `Result` donde el llamador debe decidir |
| Bug | Invariante rota, estado imposible | Se lanza y se deja subir; en los bordes fail-open se registra |

## Jerarquía de errores

```ts
export const ERROR_CODES = [
  "CONFIG_INVALID",
  "CONFIG_NOT_FOUND",
  "MODEL_INVALID",
  "STORAGE_UNAVAILABLE",
  "STORAGE_CONFLICT",
  "ADAPTER_UNSUPPORTED_VERSION",
  "GIT_UNAVAILABLE",
  "ANALYZER_TIMEOUT",
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export class AtiumError extends Error {
  readonly code: ErrorCode;
  readonly hint: string | undefined;

  constructor(code: ErrorCode, message: string, options?: { cause?: unknown; hint?: string }) {
    super(
      message,
      options !== undefined && "cause" in options ? { cause: options.cause } : undefined,
    );
    this.name = "AtiumError";
    this.code = code;
    this.hint = options?.hint;
  }
}
```

- Al envolver un error, siempre se pasa `cause` para conservar la cadena.
- `cause` solo se define si la clave está en las opciones, igual que en un `Error` nativo: sin `cause`, el error no tiene esa propiedad.
- Los códigos son parte de la API pública: no se renombran ni se reutilizan.
- Para reconocer un `AtiumError` en un `catch` se usa `isAtiumError(error)` y no `instanceof`: si se cargan a la vez el build ESM y el CommonJS de `@atium/core`, cada uno tiene su propia clase e `instanceof` falla con los errores del otro. Lo mismo pasa entre realms (`vm`, workers), así que `isAtiumError` comprueba `name === "AtiumError"` y que `code` sea un `ErrorCode` conocido.

## `Result` para fallos que el llamador debe manejar

```ts
export type Result<T, E = AtiumError> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };
```

Se usa en storage, sincronización e ingesta de archivos externos, donde fallar es normal. No se usa en todo el código: la lógica interna lanza excepciones normalmente.

## Fail-open en los bordes

Según el ADR-0006, los bordes nunca propagan errores a la suite del usuario. Hay un único helper y se usa **solo** en estos bordes: hooks del reporter, fixture, upload/sync, ejecución de cada analizador en el orquestador y escritura de reportes.

```ts
export interface FailOpenOptions<T> {
  readonly label: string;
  readonly fallback: T;
  readonly logger: Logger;
}

export async function failOpen<T>(
  options: FailOpenOptions<T>,
  fn: () => Promise<T>,
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    options.logger.warn(`${options.label} failed; continuing without it`, { error });
    return options.fallback;
  }
}

// Uso en un borde
const history = await failOpen(
  { label: "history sync", fallback: EMPTY_HISTORY, logger },
  () => storage.sync({ signal }),
);
```

No se distribuyen `try/catch` por todo el código: dentro de los bordes, el código lanza normalmente y el borde decide.

## Reglas

- Nunca un `catch` vacío. Única excepción: el `catch` alrededor de la escritura del `Logger` en su stream. El logger es el último destino de los errores (`failOpen` lo llama desde su propio `catch`), así que un fallo al escribir no tiene dónde registrarse y no puede llegar a la suite del usuario (ADR-0006). Ese `catch` lleva un comentario que lo explica.
- Nunca capturar un error para ignorarlo sin registrarlo.
- Solo se captura lo que se puede manejar; el resto se deja subir.
- En `catch`, el error es `unknown`: se estrecha antes de usarlo.

## Mensajes de error

Cada mensaje dice **qué pasó, por qué y cómo arreglarlo**.

```
✗ Invalid config

✓ Invalid config in atium.config.ts: "analyzers.flaky.windowDays" must be a positive integer (received -5).
  Hint: use a value between 1 and 365. See https://atium.dev/config#flaky
```

## Validación en los bordes

- Todo lo que entra desde fuera se valida con Zod (`safeParse`): configuración, archivos de reportes, archivos del storage, payloads de CI, respuestas de herramientas externas.
- Dentro del sistema, se confía en los tipos; no se revalida en cada función.

## Logging

```ts
export type LogLevel = "error" | "warn" | "info" | "debug";
export type LogContext = Readonly<Record<string, unknown>>;

export interface Logger {
  error(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  debug(message: string, context?: LogContext): void;
}
```

- `@atium/core` define la interfaz y la implementación ([ADR-0022](../adr/0022-logger-reloj-en-core.md)), `createStderrLogger({ stream, env, redactor, namespace, verbose })`. El stream y el entorno se inyectan; en producción son `process.stderr` y `process.env`. En los tests se usa `FakeLogger` de `@atium/core/testing`, que guarda las llamadas en `entries`.
- Formato: una línea por entrada, `<namespace> <nivel> <mensaje> <contexto JSON>`. Por ejemplo, `atium:cli warn history sync failed; continuing without it {"error":{"name":"Error","message":"..."}}`. Los caracteres de control del mensaje (salvo el tab), incluidos los saltos de línea y las secuencias ANSI, se escapan. Cada objeto del contexto se escribe una vez: si reaparece, se escribe `"[Repeated]"`, y si se contiene a sí mismo, `"[Circular]"`. Los `Error` del contexto se escriben como `{ name, message, code?, hint?, stack?, cause? }`, y el stack solo aparece con la depuración activa.
- Una implementación de `Logger` **nunca lanza**: `failOpen` registra desde su `catch` y un logger que lanzara rompería la suite del usuario.
- En los paquetes no se usa `console.*` (regla `no-console`). Se usa el `Logger` inyectado.
- Niveles: `error`, `warn`, `info` y `debug`. Los tres primeros se escriben siempre; `debug`, solo con la depuración activa.
- Contexto estructurado como segundo argumento, no concatenado en el mensaje.
- El logger aplica la redacción de datos sensibles antes de escribir.
- Depuración: `DEBUG=atium:*` o `--verbose`. `DEBUG` sigue la sintaxis del paquete debug (patrones separados por comas o espacios, `*` como comodín y exclusiones con `-`, que ganan sobre cualquier inclusión sin importar el orden) y se compara con el namespace del logger, por ejemplo `atium:cli`.

```ts
// ✗
console.log("Uploaded run " + runId + " in " + ms + "ms");

// ✓
logger.debug("Run uploaded", { runId, durationMs });
```

## Salida del CLI

- **stdout:** solo resultados (texto o el formato pedido con `--format`). Debe poder redirigirse a un archivo o a otro programa.
- **stderr:** logs, avisos y progreso.
- Los colores se desactivan con `NO_COLOR` (definida y no vacía) o cuando la salida no es una terminal.

## Timeouts y cancelación

- Toda operación de I/O externa (red, storage remoto, Git, procesos) tiene timeout.
- Las funciones asíncronas largas aceptan un `AbortSignal` y lo propagan.
- Las promesas siempre se esperan (`await`) o se marcan explícitamente con `void` y un comentario (regla `no-floating-promises`).
- Para operaciones independientes donde un fallo parcial es aceptable, se usa `Promise.allSettled`, no `Promise.all`.
