import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { systemScheduler } from "./scheduler.js";

describe("systemScheduler", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("runs the callback once the delay has passed", () => {
    const calls: number[] = [];

    systemScheduler.setTimeout(() => calls.push(Date.now()), 1000);
    vi.advanceTimersByTime(999);
    const callsBeforeDelay = calls.length;
    vi.advanceTimersByTime(1);

    expect(callsBeforeDelay).toBe(0);
    expect(calls).toHaveLength(1);
  });

  it("does not run the callback once cancelled", () => {
    let calls = 0;

    const cancel = systemScheduler.setTimeout(() => {
      calls += 1;
    }, 1000);
    cancel();
    cancel();
    vi.advanceTimersByTime(1000);

    expect(calls).toBe(0);
  });
});
