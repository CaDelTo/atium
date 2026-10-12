import type { Clock } from "../clock.js";

/**
 * {@link Clock} that always returns the same time, for deterministic tests.
 *
 * @param ms - Milliseconds since the Unix epoch, such as
 * `Date.parse("2026-10-08T14:03:00.000Z")`.
 * @returns A frozen clock whose `now()` always returns `ms`.
 * @throws RangeError if `ms` is not a finite number.
 *
 * @example
 * ```ts
 * const clock = fixedClock(Date.parse("2026-10-08T14:03:00.000Z"));
 * clock.now(); // 1791468180000
 * ```
 */
export function fixedClock(ms: number): Clock {
  if (!Number.isFinite(ms)) {
    throw new RangeError(
      `fixedClock expects a finite number of milliseconds, received ${String(ms)}.`,
    );
  }
  return Object.freeze({ now: () => ms });
}
