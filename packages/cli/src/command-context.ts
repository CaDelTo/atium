import { createRedactor, createStderrLogger, RedactConfigSchema } from "@atium/core";
import type { EnvVars, Logger, Redactor } from "@atium/core";
import { LOG_NAMESPACE } from "./defaults.js";
import type { GlobalOptions } from "./global-options.js";
import type { CliIo, OutputStream } from "./io.js";

/** What a command receives to do its work. */
export interface CommandContext {
  /** Working directory, absolute. */
  readonly cwd: string;
  /** Environment variables. */
  readonly env: EnvVars;
  /** For results only; logs go to `logger`. */
  readonly stdout: OutputStream;
  /** Writes Atium's own diagnostics to stderr. */
  readonly logger: Logger;
  /** The global options given. */
  readonly globals: GlobalOptions;
}

/**
 * Builds the context of a command. Loaded only once a command runs, so
 * `atium --help` does not load `@atium/core`.
 *
 * @param io - The process streams, working directory and environment.
 * @param globals - The global options given.
 * @returns The context.
 */
export function createCommandContext(io: CliIo, globals: GlobalOptions): CommandContext {
  return {
    cwd: io.cwd,
    env: io.env,
    stdout: io.stdout,
    logger: createCliLogger(io, globals),
    globals,
  };
}

/**
 * Creates the logger of the CLI: stderr, the default redaction and the level
 * of `--quiet` or `--verbose`, or `info` without them.
 *
 * @param io - The process streams and environment.
 * @param globals - The global options given, if they were parsed.
 * @returns The logger.
 */
export function createCliLogger(io: CliIo, globals: GlobalOptions | undefined): Logger {
  const level = globals?.logLevel;
  return createStderrLogger({
    stream: io.stderr,
    env: io.env,
    redactor: createCliRedactor(),
    namespace: LOG_NAMESPACE,
    ...(level === undefined ? {} : { level }),
  });
}

/**
 * The redactor of the CLI's own output: the default patterns of
 * 20-security-privacy.md §28.1, since no command loads the config's `redact`
 * section yet.
 *
 * @returns A new redactor.
 */
export function createCliRedactor(): Redactor {
  return createRedactor(RedactConfigSchema.parse({}));
}
