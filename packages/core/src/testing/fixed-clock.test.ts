import { describe, expect, it } from "vitest";
import { fixedClock } from "./fixed-clock.js";

const START = Date.parse("2026-10-08T14:03:00.000Z");

describe("fixedClock", () => {
  it("always returns the given time", () => {
    const clock = fixedClock(START);

    expect([clock.now(), clock.now()]).toEqual([START, START]);
  });

  it("is frozen", () => {
    expect(Object.isFrozen(fixedClock(START))).toBe(true);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY])("rejects %s", (ms) => {
    expect(() => fixedClock(ms)).toThrow(RangeError);
  });
});
