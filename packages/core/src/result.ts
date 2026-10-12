import type { AtiumError } from "./errors.js";

/**
 * Outcome of an operation whose failure is normal and must be handled by the
 * caller, such as reading storage, syncing or ingesting external files.
 *
 * Internal logic throws instead; `Result` is only for those boundaries.
 * Narrow it by checking `ok`.
 *
 * @typeParam T - Value on success.
 * @typeParam E - Error on failure.
 *
 * @example
 * ```ts
 * const result = await storage.read(runId);
 * if (!result.ok) {
 *   logger.warn("Run not available", { runId, error: result.error });
 *   return;
 * }
 * use(result.value);
 * ```
 */
export type Result<T, E = AtiumError> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E };

/**
 * Builds a successful {@link Result}.
 *
 * @typeParam T - Type of the value.
 * @param value - The value produced.
 * @returns A result with `ok: true`.
 *
 * @example
 * ```ts
 * function parsePort(text: string): Result<number> {
 *   const port = Number(text);
 *   return Number.isInteger(port) && port > 0
 *     ? ok(port)
 *     : err(new AtiumError("CONFIG_INVALID", `"${text}" is not a valid port.`));
 * }
 * ```
 */
export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

/**
 * Builds a failed {@link Result}.
 *
 * @typeParam E - Type of the error.
 * @param error - Why it failed, usually an {@link AtiumError}.
 * @returns A result with `ok: false`.
 *
 * @example
 * ```ts
 * if (!existsSync(path)) {
 *   return err(new AtiumError("CONFIG_NOT_FOUND", `No config at ${path}.`, {
 *     hint: "Run `atium init` to create one.",
 *   }));
 * }
 * ```
 */
export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}
