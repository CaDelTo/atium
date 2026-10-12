import { AtiumError } from "../errors.js";

/**
 * Runs `action` and returns the {@link AtiumError} it throws, so a test can
 * assert on its `code`, `message` and `hint`.
 *
 * @param action - Code expected to throw an `AtiumError`.
 * @returns The error thrown.
 * @throws The error itself if it is not an `AtiumError`, or an `Error` if
 * nothing was thrown, so the test fails.
 *
 * @example
 * ```ts
 * expect(thrownAtiumError(() => parse(input)).code).toBe("CONFIG_INVALID");
 * ```
 */
export function thrownAtiumError(action: () => unknown): AtiumError {
  try {
    action();
  } catch (error) {
    return asAtiumError(error);
  }
  throw new Error("Expected an AtiumError, but nothing was thrown.");
}

/**
 * Awaits `promise` and returns the {@link AtiumError} it rejects with.
 *
 * @param promise - Work expected to reject with an `AtiumError`.
 * @returns The rejection reason.
 * @throws The reason itself if it is not an `AtiumError`, or an `Error` if the
 * promise resolved, so the test fails.
 *
 * @example
 * ```ts
 * expect((await rejectedAtiumError(loadConfig(options))).code).toBe("CONFIG_NOT_FOUND");
 * ```
 */
export async function rejectedAtiumError(promise: Promise<unknown>): Promise<AtiumError> {
  try {
    await promise;
  } catch (error) {
    return asAtiumError(error);
  }
  throw new Error("Expected an AtiumError, but the promise resolved.");
}

function asAtiumError(error: unknown): AtiumError {
  if (error instanceof AtiumError) {
    return error;
  }
  throw error;
}
