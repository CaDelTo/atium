import { describe, expect, it } from "vitest";
import { systemClock } from "./clock.js";

describe("systemClock", () => {
  it("returns the system time in milliseconds", () => {
    const before = Date.now();

    const now = systemClock.now();

    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(Date.now());
  });

  it("is frozen", () => {
    expect(Object.isFrozen(systemClock)).toBe(true);
  });
});
