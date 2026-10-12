/**
 * Every code an {@link AtiumError} can carry.
 *
 * Codes are part of the public API: they are never renamed or reused. A new
 * kind of expected failure gets a new code.
 */
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

/** Machine-readable identifier of an expected failure. See {@link ERROR_CODES}. */
export type ErrorCode = (typeof ERROR_CODES)[number];

/**
 * Error for expected failures, such as an invalid config or an unavailable
 * storage. Bugs (broken invariants) use plain `Error` instead.
 *
 * The message says what happened and why; the hint says how to fix it. When
 * wrapping another error, always pass it as `cause` to keep the chain.
 *
 * @example
 * ```ts
 * try {
 *   return JSON.parse(text);
 * } catch (error) {
 *   throw new AtiumError("MODEL_INVALID", `Run file ${path} is not valid JSON.`, {
 *     cause: error,
 *     hint: "Delete the file and run the suite again.",
 *   });
 * }
 * ```
 */
export class AtiumError extends Error {
  /** Identifies the kind of failure, so callers can handle it without parsing the message. */
  readonly code: ErrorCode;
  /** How to fix the problem, shown to the user after the message. */
  readonly hint: string | undefined;

  /**
   * @param code - Kind of failure.
   * @param message - What happened and why.
   * @param options - `cause`, the error being wrapped, and `hint`, how to fix
   * it. `cause` is only set when the key is present, as with a native `Error`.
   */
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

/**
 * Tells whether a value is an {@link AtiumError}.
 *
 * Prefer it over `instanceof`: when both the ESM and the CommonJS build of
 * `@atium/core` are loaded, each has its own `AtiumError` class and
 * `instanceof` fails for errors created by the other one. The same happens
 * across realms (`vm` contexts, workers). So this check also accepts any
 * object named `"AtiumError"` whose `code` is a known {@link ErrorCode}.
 *
 * @param value - Any value, typically the `unknown` of a `catch` clause.
 * @returns `true` if the value is an `AtiumError` from any copy of the package.
 *
 * @example
 * ```ts
 * catch (error) {
 *   if (isAtiumError(error) && error.code === "CONFIG_NOT_FOUND") {
 *     return DEFAULT_CONFIG;
 *   }
 *   throw error;
 * }
 * ```
 */
export function isAtiumError(value: unknown): value is AtiumError {
  if (value instanceof AtiumError) {
    return true;
  }
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    value.name === "AtiumError" &&
    "code" in value &&
    ERROR_CODES.some((code) => code === value.code)
  );
}
