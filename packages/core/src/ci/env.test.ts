import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { envPositiveInt, toPositiveInt } from "./env.js";

describe("envPositiveInt", () => {
  it("reads a positive integer and ignores anything else", () => {
    const env = { ONE: "1", ZERO: "0", NEGATIVE: "-1", DECIMAL: "3.5", PADDED: "07", TEXT: "abc" };

    expect(envPositiveInt(env, "ONE")).toBe(1);
    for (const name of ["ZERO", "NEGATIVE", "DECIMAL", "PADDED", "TEXT", "MISSING"]) {
      expect(envPositiveInt(env, name)).toBeUndefined();
    }
  });
});

describe("toPositiveInt", () => {
  it("round-trips every positive safe integer", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: Number.MAX_SAFE_INTEGER }), (number) => {
        expect(toPositiveInt(String(number))).toBe(number);
      }),
    );
  });

  it("rejects integers beyond the safe range", () => {
    expect(toPositiveInt("9007199254740993")).toBeUndefined();
  });

  it("returns a positive integer or nothing for any string", () => {
    fc.assert(
      fc.property(fc.string(), (text) => {
        const number = toPositiveInt(text);
        expect(number === undefined || (Number.isSafeInteger(number) && number > 0)).toBe(true);
      }),
    );
  });
});
