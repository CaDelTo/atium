import type { Result } from "../result.js";

/**
 * Returns the value of an `ok` {@link Result}, so a test can use it directly.
 *
 * @param result - Result expected to be `ok`.
 * @returns Its value.
 * @throws An `Error` with the code and message of the error, and the error
 * as `cause`, when the result is not `ok`, so the test fails.
 *
 * @example
 * ```ts
 * const storage = unwrap(await openSqliteStorage({ rootDir, logger }));
 * ```
 */
export function unwrap<T>(result: Result<T>): T {
  if (!result.ok) {
    throw new Error(`Expected ok, got ${result.error.code}: ${result.error.message}`, {
      cause: result.error,
    });
  }
  return result.value;
}
