import type { LogContext, Logger, LogLevel } from "../logger.js";

/** One call recorded by {@link FakeLogger}. */
export interface LogEntry {
  /** Logger method that was called. */
  readonly level: LogLevel;
  /** Message passed to the call. */
  readonly message: string;
  /** Context passed to the call, or `undefined` if none was given. */
  readonly context: LogContext | undefined;
}

/**
 * {@link Logger} that records every call in memory instead of writing it, so
 * tests can assert on what was logged.
 *
 * @example
 * ```ts
 * const logger = new FakeLogger();
 * await failOpen({ label: "sync", fallback: [], logger }, failingSync);
 * expect(logger.entries).toEqual([
 *   { level: "warn", message: "sync failed; continuing without it", context: { error } },
 * ]);
 * ```
 */
export class FakeLogger implements Logger {
  readonly #entries: LogEntry[] = [];

  /** Every call so far, in order. */
  get entries(): readonly LogEntry[] {
    return this.#entries;
  }

  /**
   * Records an `error` entry.
   *
   * @param message - Message to record.
   * @param context - Context to record, if any.
   */
  error(message: string, context?: LogContext): void {
    this.#record("error", message, context);
  }

  /**
   * Records a `warn` entry.
   *
   * @param message - Message to record.
   * @param context - Context to record, if any.
   */
  warn(message: string, context?: LogContext): void {
    this.#record("warn", message, context);
  }

  /**
   * Records an `info` entry.
   *
   * @param message - Message to record.
   * @param context - Context to record, if any.
   */
  info(message: string, context?: LogContext): void {
    this.#record("info", message, context);
  }

  /**
   * Records a `debug` entry.
   *
   * @param message - Message to record.
   * @param context - Context to record, if any.
   */
  debug(message: string, context?: LogContext): void {
    this.#record("debug", message, context);
  }

  #record(level: LogLevel, message: string, context: LogContext | undefined): void {
    this.#entries.push({ level, message, context });
  }
}
