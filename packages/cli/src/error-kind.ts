import { assertNever, isAtiumError } from "@atium/core";
import type { AtiumError, ErrorCode } from "@atium/core";
import { EXIT_CODES } from "./exit-codes.js";
import type { ExitCode } from "./exit-codes.js";
import { UsageError } from "./usage-error.js";

/**
 * Whose a failure is: `"usage"` for a configuration or usage error, which
 * the user must fix, or `"internal"` for anything else.
 */
export type ErrorKind = "usage" | "internal";

/**
 * Tells whether an error thrown by a command is a configuration or usage
 * error (18-cli-config.md §26.2).
 *
 * @param error - Anything a command threw.
 * @returns `true` for a {@link UsageError} and for an `AtiumError` with
 * `CONFIG_INVALID` or `CONFIG_NOT_FOUND`; `false` for everything else,
 * including any other `AtiumError`, which is internal.
 */
export function isUserError(error: unknown): error is UsageError | AtiumError {
  if (error instanceof UsageError) {
    return true;
  }
  return isAtiumError(error) && kindOfCode(error.code) === "usage";
}

function kindOfCode(code: ErrorCode): ErrorKind {
  switch (code) {
    case "CONFIG_INVALID":
    case "CONFIG_NOT_FOUND":
      return "usage";
    case "MODEL_INVALID":
    case "STORAGE_UNAVAILABLE":
    case "STORAGE_CONFLICT":
    case "ADAPTER_UNSUPPORTED_VERSION":
    case "GIT_UNAVAILABLE":
    case "ANALYZER_TIMEOUT":
      return "internal";
    default:
      return assertNever(code);
  }
}

/**
 * The exit code for a failed command (18-cli-config.md §26.2, ADR-0006).
 *
 * @param kind - Whose the failure is.
 * @param strict - Whether `--strict` was given.
 * @returns `2` for a configuration or usage error. For an internal error,
 * `3` with `--strict`, and otherwise `0`, so a failure in Atium never blocks
 * the pipeline (fail-open).
 */
export function exitCodeFor(kind: ErrorKind, strict: boolean): ExitCode {
  switch (kind) {
    case "usage":
      return EXIT_CODES.usage;
    case "internal":
      return strict ? EXIT_CODES.internal : EXIT_CODES.ok;
    default:
      return assertNever(kind);
  }
}
