import { createCliLogger, createCliRedactor } from "./command-context.js";
import { exitCodeFor, isUserError } from "./error-kind.js";
import type { ExitCode } from "./exit-codes.js";
import type { GlobalOptions } from "./global-options.js";
import type { CliIo } from "./io.js";
import { ERRORS } from "./messages.js";
import { terminalText } from "./terminal-text.js";

/** Where a command failed. */
export interface FailedCommand {
  /** The process streams and environment. */
  readonly io: CliIo;
  /** What was typed to run it, such as `"atium init"`. */
  readonly name: string;
  /** The global options given, or `undefined` if they were not parsed yet. */
  readonly globals: GlobalOptions | undefined;
}

/**
 * Reports an error thrown by a command and chooses the exit code
 * (18-cli-config.md §26.2, ADR-0006):
 *
 * - A configuration or usage error is the user's to fix: its message and
 *   hint go to stderr, redacted and with control characters escaped, and the
 *   code is 2.
 * - Any other error is internal: it is logged as an error, which `--quiet`
 *   still shows, and the code is 3 with `--strict` or else 0.
 *
 * With `--verbose`, the error is also logged with its cause and stack.
 *
 * @param error - Anything the command threw.
 * @param failed - The command and its options.
 * @returns The exit code. It never throws: a failing stderr loses the
 * message, not the exit code.
 */
export function reportError(error: unknown, failed: FailedCommand): ExitCode {
  const logger = createCliLogger(failed.io, failed.globals);
  const strict = failed.globals?.strict === true;
  if (!isUserError(error)) {
    logger.error(ERRORS.internal(failed.name, strict), { error });
    return exitCodeFor("internal", strict);
  }
  const hint = error.hint === undefined ? "" : `  ${ERRORS.hintPrefix}${error.hint}\n`;
  const redactor = createCliRedactor();
  try {
    failed.io.stderr.write(terminalText(redactor.redact(`${error.message}\n${hint}`)));
  } catch {
    // Like the logger: a failing stderr has nowhere to report to, and the
    // exit code still tells the user's pipeline what happened.
  }
  logger.debug(ERRORS.details, { error });
  return exitCodeFor("usage", strict);
}
