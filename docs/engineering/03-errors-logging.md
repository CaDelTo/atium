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
    super(message, { cause: options?.cause });
    this.name = "AtiumError";
    this.code = code;
    this.hint = options?.hint;
  }
}
```

- Al envolver un error, siempre se pasa `cause` para conservar la cadena.
- Los códigos son parte de la API pública: no se renombran ni se reutilizan.

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

- Nunca un `catch` vacío.
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

- En los paquetes no se usa `console.*` (regla `no-console`). Se usa el `Logger` inyectado.
- Niveles: `error`, `warn`, `info`, `debug`.
- Contexto estructurado como segundo argumento, no concatenado en el mensaje.
- El logger aplica la redacción de datos sensibles antes de escribir.
- Depuración: `DEBUG=atium:*` o `--verbose`.

```ts
// ✗
console.log("Uploaded run " + runId + " in " + ms + "ms");

// ✓
logger.debug("Run uploaded", { runId, durationMs });
```

## Salida del CLI

- **stdout:** solo resultados (texto o el formato pedido con `--format`). Debe poder redirigirse a un archivo o a otro programa.
- **stderr:** logs, avisos y progreso.
- Los colores se desactivan con `NO_COLOR` o cuando la salida no es una terminal.

## Timeouts y cancelación

- Toda operación de I/O externa (red, storage remoto, Git, procesos) tiene timeout.
- Las funciones asíncronas largas aceptan un `AbortSignal` y lo propagan.
- Las promesas siempre se esperan (`await`) o se marcan explícitamente con `void` y un comentario (regla `no-floating-promises`).
- Para operaciones independientes donde un fallo parcial es aceptable, se usa `Promise.allSettled`, no `Promise.all`.
