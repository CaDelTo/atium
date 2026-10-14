import { describe, expect, it } from "vitest";
import { ManualScheduler } from "./manual-scheduler.js";

describe("ManualScheduler", () => {
  it("runs a callback only when the time advances to its delay", () => {
    const scheduler = new ManualScheduler();
    const calls: number[] = [];
    scheduler.setTimeout(() => calls.push(scheduler.elapsed), 100);

    scheduler.advance(99);
    const callsBeforeDelay = [...calls];
    scheduler.advance(1);

    expect(callsBeforeDelay).toEqual([]);
    expect(calls).toEqual([100]);
    expect(scheduler.pending).toBe(0);
  });

  it("runs due callbacks in order of due time, then of scheduling", () => {
    const scheduler = new ManualScheduler();
    const calls: string[] = [];
    scheduler.setTimeout(() => calls.push("late"), 30);
    scheduler.setTimeout(() => calls.push("first at 10"), 10);
    scheduler.setTimeout(() => calls.push("second at 10"), 10);

    scheduler.advance(100);

    expect(calls).toEqual(["first at 10", "second at 10", "late"]);
    expect(scheduler.elapsed).toBe(100);
  });

  it("runs a callback scheduled by another one when it is due within the advanced time", () => {
    const scheduler = new ManualScheduler();
    const calls: number[] = [];
    scheduler.setTimeout(() => {
      scheduler.setTimeout(() => calls.push(scheduler.elapsed), 5);
    }, 10);

    scheduler.advance(20);

    expect(calls).toEqual([15]);
  });

  it("treats a negative delay as 0", () => {
    const scheduler = new ManualScheduler();
    let calls = 0;
    scheduler.setTimeout(() => {
      calls += 1;
    }, -5);

    scheduler.advance(0);

    expect(calls).toBe(1);
  });

  it("does not run a cancelled callback", () => {
    const scheduler = new ManualScheduler();
    let calls = 0;
    const cancel = scheduler.setTimeout(() => {
      calls += 1;
    }, 10);

    cancel();
    scheduler.advance(10);

    expect(calls).toBe(0);
    expect(scheduler.pending).toBe(0);
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])(
    "throws a RangeError when advancing by %s",
    (ms) => {
      expect(() => {
        new ManualScheduler().advance(ms);
      }).toThrow(RangeError);
    },
  );
});
