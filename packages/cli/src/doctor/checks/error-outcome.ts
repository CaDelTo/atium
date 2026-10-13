import type { AtiumError, Logger } from "@atium/core";
import { ERRORS } from "../../messages.js";
import type { UsageError } from "../../usage-error.js";

/** The message and hint of a check that did not pass because of an error. */
export interface ErrorOutcome {
  /** The error's message. */
  readonly message: string;
  /** The error's hint, or the check's own if the error has none. */
  readonly hint: string;
}

/**
 * Turns an expected error of a check into its message and hint, and logs the
 * error at debug level, so `--verbose` shows its cause and stack.
 *
 * @param error - The error the check expects, such as `CONFIG_INVALID`.
 * @param fallbackHint - The hint when the error has none.
 * @param logger - Receives the error.
 * @returns The message and hint for the check.
 */
export function errorOutcome(
  error: AtiumError | UsageError,
  fallbackHint: string,
  logger: Logger,
): ErrorOutcome {
  logger.debug(ERRORS.details, { error });
  return { message: error.message, hint: error.hint ?? fallbackHint };
}
