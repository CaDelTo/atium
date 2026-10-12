/**
 * Every log level, from the most to the least severe. Used as a threshold,
 * a level lets through itself and every level before it.
 */
export const LOG_LEVELS = ["error", "warn", "info", "debug"] as const;

/** Severity of a log entry, one per {@link Logger} method. See {@link LOG_LEVELS}. */
export type LogLevel = (typeof LOG_LEVELS)[number];

/**
 * Structured data attached to a log entry, such as `{ runId, durationMs }`.
 * Kept separate from the message instead of concatenated into it.
 */
export type LogContext = Readonly<Record<string, unknown>>;

/**
 * Destination for Atium's own diagnostics. Packages receive it by injection
 * and never use `console.*`.
 *
 * Implementations redact sensitive data before writing and **must never
 * throw**: `failOpen` logs from inside its error handler, so a throwing
 * logger would reach the user's test suite.
 *
 * @example
 * ```ts
 * logger.debug("Run uploaded", { runId, durationMs });
 * ```
 */
export interface Logger {
  /**
   * Something failed and Atium could not do what was asked.
   *
   * @param message - What happened, without interpolated data.
   * @param context - Structured data about it, if any.
   */
  error(message: string, context?: LogContext): void;
  /**
   * Something failed or looks wrong, but Atium continued.
   *
   * @param message - What happened, without interpolated data.
   * @param context - Structured data about it, if any.
   */
  warn(message: string, context?: LogContext): void;
  /**
   * Progress the user may want to see.
   *
   * @param message - What happened, without interpolated data.
   * @param context - Structured data about it, if any.
   */
  info(message: string, context?: LogContext): void;
  /**
   * Details for troubleshooting, shown only when debugging is enabled.
   *
   * @param message - What happened, without interpolated data.
   * @param context - Structured data about it, if any.
   */
  debug(message: string, context?: LogContext): void;
}
