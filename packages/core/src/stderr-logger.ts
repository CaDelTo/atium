import pc from "picocolors";
import { assertNever } from "./assert-never.js";
import { isDebugEnabled } from "./debug-namespaces.js";
import type { LogContext, Logger, LogLevel } from "./logger.js";
import type { Redactor } from "./redact/redactor.js";
import { serializeContext } from "./serialize-context.js";

type Colors = ReturnType<typeof pc.createColors>;

/** Where a {@link createStderrLogger} logger writes; `process.stderr` fits. */
export interface LogStream {
  /** Writes one chunk of text. Its return value is ignored. */
  write(chunk: string): unknown;
  /** Whether the stream is a terminal. Colors are used only if it is `true`. */
  readonly isTTY?: boolean;
}

/** Options for {@link createStderrLogger}. */
export interface StderrLoggerOptions {
  /** Destination of the log lines, normally `process.stderr`. */
  readonly stream: LogStream;
  /** Environment to read `DEBUG` and `NO_COLOR` from, normally `process.env`. */
  readonly env: Readonly<Record<string, string | undefined>>;
  /** Applied to the message and the context before writing. */
  readonly redactor: Redactor;
  /**
   * Who logs, such as `"atium:cli"`. It starts every line and is what `DEBUG`
   * patterns match, so `DEBUG=atium:*` enables every Atium logger.
   */
  readonly namespace: string;
  /** Enables `debug` entries regardless of `DEBUG`, as `--verbose` does. */
  readonly verbose?: boolean;
}

/** Written instead of a line that could not be formatted. */
const UNFORMATTABLE_LINE = "[unformattable log entry]";

/**
 * Creates the {@link Logger} for Atium's own diagnostics, which writes one
 * line per entry to stderr (03-errors-logging.md, "Salida del CLI"):
 *
 * ```text
 * atium:cli warn history sync failed; continuing without it {"error":{"name":"Error","message":"..."}}
 * ```
 *
 * - `error`, `warn` and `info` are always written. `debug` is written only
 *   with `verbose` or when `DEBUG` enables the namespace; then error stacks
 *   are included in every entry, whatever its level.
 * - The message goes through `redactor.redact`, with control characters other
 *   than the tab escaped, so an entry cannot forge another one or drive the
 *   terminal; the context goes, as JSON, through `redactor.redactFields`.
 * - The level is colored only if the stream is a terminal and `NO_COLOR` is
 *   unset or empty.
 * - It never throws, as the {@link Logger} contract requires: a context that
 *   cannot be serialized is replaced by a marker, and a failing write is
 *   dropped.
 *
 * @param options - Stream, environment, redactor, namespace and verbosity.
 * @returns The logger. It keeps no state besides its options.
 *
 * @example
 * ```ts
 * const logger = createStderrLogger({
 *   stream: process.stderr,
 *   env: process.env,
 *   redactor: createRedactor(RedactConfigSchema.parse({})),
 *   namespace: "atium:cli",
 *   verbose: flags.verbose,
 * });
 * logger.debug("Run uploaded", { runId, durationMs });
 * ```
 */
export function createStderrLogger(options: StderrLoggerOptions): Logger {
  const { stream, redactor, namespace } = options;
  const debugEnabled = options.verbose === true || isDebugEnabled(options.env["DEBUG"], namespace);
  const colors = pc.createColors(stream.isTTY === true && !options.env["NO_COLOR"]);

  const format = (level: LogLevel, message: string, context: LogContext | undefined): string => {
    const head = `${colors.dim(namespace)} ${colorLevel(colors, level)} ${oneLine(redactor.redact(message))}`;
    if (context === undefined) {
      return head;
    }
    return `${head} ${serializeContext(context, { redactor, includeStack: debugEnabled })}`;
  };

  const write = (level: LogLevel, message: string, context: LogContext | undefined): void => {
    let line: string;
    try {
      line = format(level, message, context);
    } catch {
      line = `${namespace} ${level} ${UNFORMATTABLE_LINE}`;
    }
    try {
      stream.write(`${line}\n`);
    } catch {
      // The logger is the last place errors are reported to, and failOpen
      // calls it from its own catch: a failing stream has nowhere to go and
      // must not reach the user's test suite (ADR-0006).
    }
  };

  return Object.freeze({
    error: (message: string, context?: LogContext) => {
      write("error", message, context);
    },
    warn: (message: string, context?: LogContext) => {
      write("warn", message, context);
    },
    info: (message: string, context?: LogContext) => {
      write("info", message, context);
    },
    debug: (message: string, context?: LogContext) => {
      if (debugEnabled) {
        write("debug", message, context);
      }
    },
  });
}

/** Control characters, which could break the line or drive the terminal, and Unicode line breaks. */
const CONTROL_CHARACTERS = /[\p{Cc}\u2028\u2029]/gu;

/**
 * Escapes control characters except the tab, so every entry stays on a single
 * line and cannot move the cursor, recolor or clear the terminal.
 */
function oneLine(text: string): string {
  return text.replace(CONTROL_CHARACTERS, (char) => {
    switch (char) {
      case "\t":
        return char;
      case "\n":
        return "\\n";
      case "\r":
        return "\\r";
      default:
        return `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`;
    }
  });
}

function colorLevel(colors: Colors, level: LogLevel): string {
  switch (level) {
    case "error":
      return colors.red(level);
    case "warn":
      return colors.yellow(level);
    case "info":
      return colors.cyan(level);
    case "debug":
      return colors.gray(level);
    default:
      return assertNever(level);
  }
}
