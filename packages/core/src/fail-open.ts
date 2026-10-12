import type { Logger } from "./logger.js";

/** Options for {@link failOpen}. */
export interface FailOpenOptions<T> {
  /** What is being attempted, such as `"history sync"`. Starts the warning message. */
  readonly label: string;
  /**
   * Value returned instead when the operation fails. It is returned as is,
   * not copied, so use an immutable value (for example a frozen `EMPTY_*`
   * constant) if callers may share it.
   */
  readonly fallback: T;
  /** Receives the warning when the operation fails. */
  readonly logger: Logger;
}

/**
 * Runs an operation at a fail-open boundary (ADR-0006): if it throws or
 * rejects, logs a warning with the error and returns the fallback instead, so
 * the failure never reaches the user's test suite.
 *
 * Use it **only** at those boundaries: reporter hooks, the fixture,
 * upload/sync, each analyzer run by the orchestrator, and report writing.
 * Inside them, code throws normally and the boundary decides.
 *
 * @param options - Label for the warning, fallback value and logger.
 * @param fn - The operation. It may throw synchronously or reject.
 * @returns The operation's value, or `options.fallback` if it failed. Never
 * rejects, as long as the logger keeps its contract of never throwing.
 *
 * @example
 * ```ts
 * const history = await failOpen(
 *   { label: "history sync", fallback: EMPTY_HISTORY, logger },
 *   () => storage.sync({ signal }),
 * );
 * ```
 */
export async function failOpen<T>(options: FailOpenOptions<T>, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    options.logger.warn(`${options.label} failed; continuing without it`, { error });
    return options.fallback;
  }
}
