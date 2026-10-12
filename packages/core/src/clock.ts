/**
 * Source of the current time. Code that needs the time receives a `Clock` by
 * injection instead of calling `Date.now()`, so it stays deterministic in
 * tests (02-code-design.md, "Determinismo").
 *
 * @example
 * ```ts
 * const startedAt = clock.now();
 * ```
 */
export interface Clock {
  /**
   * Current time.
   *
   * @returns Milliseconds since the Unix epoch, like `Date.now()`.
   */
  now(): number;
}

/** {@link Clock} backed by the system time. Use it only where the program is assembled. */
export const systemClock: Clock = Object.freeze({ now: () => Date.now() });
