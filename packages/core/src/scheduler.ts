/**
 * Schedules callbacks in time. Code that needs a timeout receives a
 * `Scheduler` by injection instead of calling the global `setTimeout`, so tests
 * control when time passes (02-code-design.md, "Determinismo").
 *
 * @example
 * ```ts
 * const cancel = scheduler.setTimeout(() => controller.abort(), 1000);
 * // ...
 * cancel();
 * ```
 */
export interface Scheduler {
  /**
   * Runs a callback once, after a delay.
   *
   * @param callback - Called once when the delay has passed, unless cancelled before.
   * @param ms - Delay in milliseconds.
   * @returns A function that cancels the callback. Calling it after the
   * callback ran, or twice, does nothing.
   */
  setTimeout(callback: () => void, ms: number): () => void;
}

/** {@link Scheduler} backed by the global timers. Use it only where the program is assembled. */
export const systemScheduler: Scheduler = Object.freeze({
  setTimeout(callback: () => void, ms: number): () => void {
    const handle = setTimeout(callback, ms);
    return () => {
      clearTimeout(handle);
    };
  },
});
