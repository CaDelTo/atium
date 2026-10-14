import type { Scheduler } from "../scheduler.js";

interface PendingTimer {
  readonly dueAt: number;
  readonly order: number;
  readonly callback: () => void;
}

/**
 * {@link Scheduler} whose time only moves when the test calls
 * {@link ManualScheduler.advance}, for deterministic timeout tests.
 *
 * @example
 * ```ts
 * const scheduler = new ManualScheduler();
 * scheduler.setTimeout(onTimeout, 1000);
 * scheduler.advance(999); // nothing runs
 * scheduler.advance(1); // onTimeout runs
 * ```
 */
export class ManualScheduler implements Scheduler {
  #now = 0;
  #nextOrder = 0;
  readonly #timers = new Set<PendingTimer>();

  /** Milliseconds advanced since the scheduler was created. */
  get elapsed(): number {
    return this.#now;
  }

  /** Callbacks scheduled that have neither run nor been cancelled. */
  get pending(): number {
    return this.#timers.size;
  }

  /**
   * Schedules a callback to run when the time has advanced `ms` from now.
   *
   * @param callback - Called once, from {@link ManualScheduler.advance}.
   * @param ms - Delay in milliseconds. Negative or `NaN` counts as 0, as with
   * the global `setTimeout`.
   * @returns A function that cancels the callback.
   */
  setTimeout(callback: () => void, ms: number): () => void {
    const timer: PendingTimer = {
      dueAt: this.#now + (ms > 0 ? ms : 0),
      order: this.#nextOrder++,
      callback,
    };
    this.#timers.add(timer);
    return () => {
      this.#timers.delete(timer);
    };
  }

  /**
   * Advances the time and runs, synchronously, every callback that becomes
   * due, in order of due time and then of scheduling. A callback scheduled
   * by another one runs too if it is due within the advanced time.
   *
   * @param ms - Milliseconds to advance.
   * @throws RangeError if `ms` is negative or not finite.
   */
  advance(ms: number): void {
    if (!Number.isFinite(ms) || ms < 0) {
      throw new RangeError(
        `ManualScheduler.advance expects a finite, non-negative number of milliseconds, received ${String(ms)}.`,
      );
    }
    const target = this.#now + ms;
    for (let next = this.#nextDue(target); next !== undefined; next = this.#nextDue(target)) {
      this.#timers.delete(next);
      this.#now = next.dueAt;
      next.callback();
    }
    this.#now = target;
  }

  #nextDue(target: number): PendingTimer | undefined {
    let next: PendingTimer | undefined;
    for (const timer of this.#timers) {
      if (
        timer.dueAt <= target &&
        (next === undefined ||
          timer.dueAt < next.dueAt ||
          (timer.dueAt === next.dueAt && timer.order < next.order))
      ) {
        next = timer;
      }
    }
    return next;
  }
}
