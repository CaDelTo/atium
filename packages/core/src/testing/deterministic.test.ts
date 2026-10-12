import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { RunIdSchema } from "../model/ids.js";
import { FIXED_START, fixedTimePlus, seededHex, seededRunId } from "./deterministic.js";

// Fixed seed, so a failure reproduces (04-testing.md, "Determinismo").
const runOptions = { seed: 20261011, numRuns: 500 };

describe("seededHex", () => {
  it("always returns 16 lowercase hex characters", () => {
    fc.assert(
      fc.property(fc.string(), (seed) => {
        expect(seededHex(seed)).toMatch(/^[0-9a-f]{16}$/);
      }),
      runOptions,
    );
  });

  it("returns the same value for the same seed and different values for different seeds", () => {
    expect(seededHex("checkout")).toBe(seededHex("checkout"));
    expect(seededHex("checkout")).not.toBe(seededHex("login"));
  });
});

describe("seededRunId", () => {
  it("always returns a valid UUID v7", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0 }), (seed) => {
        expect(RunIdSchema.safeParse(seededRunId(seed)).success).toBe(true);
      }),
      runOptions,
    );
  });

  it("encodes the fixed start as the UUID v7 timestamp", () => {
    const timeHex = seededRunId(1).replaceAll("-", "").slice(0, 12);

    expect(new Date(Number.parseInt(timeHex, 16)).toISOString()).toBe(FIXED_START);
  });

  it("returns the same id for the same seed and different ids for different seeds", () => {
    expect(seededRunId(1)).toBe(seededRunId(1));
    expect(seededRunId(1)).not.toBe(seededRunId(2));
  });
});

describe("fixedTimePlus", () => {
  it("adds the offset to the fixed start", () => {
    expect(fixedTimePlus(0)).toBe(FIXED_START);
    expect(fixedTimePlus(90_000)).toBe("2026-10-08T14:04:30.000Z");
  });
});
