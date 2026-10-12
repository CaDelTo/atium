import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { fingerprintOf } from "./fingerprint-of.js";

// Fixed seed, so a failure reproduces (04-testing.md, "Determinismo").
const runOptions = { seed: 20261012, numRuns: 500 };

// Any Unicode text, including lone surrogates, separators and quotes.
const text = fc.string({ unit: "binary" });
type Parts = [string, ...string[]];
const parts = fc.tuple(text, fc.array(text, { maxLength: 6 }));

describe("fingerprintOf", () => {
  it("always returns 16 lowercase hex characters", () => {
    fc.assert(
      fc.property(parts, ([first, rest]) => {
        expect(fingerprintOf([first, ...rest])).toMatch(/^[0-9a-f]{16}$/);
      }),
      runOptions,
    );
  });

  it("returns the same fingerprint for the same parts", () => {
    fc.assert(
      fc.property(parts, ([first, rest]) => {
        expect(fingerprintOf([first, ...structuredClone(rest)])).toBe(
          fingerprintOf([first, ...rest]),
        );
      }),
      runOptions,
    );
  });

  it("hashes sha1 of the parts encoded with JSON.stringify", () => {
    // printf '%s' '["E2E001","tests/cart.spec.ts","cart › checkout","0"]' | shasum -a 1
    expect(fingerprintOf(["E2E001", "tests/cart.spec.ts", "cart › checkout", "0"])).toBe(
      "5aa9f042a80450f7",
    );
  });

  it.each<[Parts, Parts]>([
    [["a|b"], ["a", "b"]],
    [["a b"], ["a", "b"]],
    [['a","b'], ["a", "b"]],
    [["ab"], ["a", "b"]],
    [["a", ""], ["a"]],
    [["\uD800"], ["\uDC00"]],
  ])("distinguishes %j from %j", (left, right) => {
    expect(fingerprintOf(left)).not.toBe(fingerprintOf(right));
  });

  it("gives different fingerprints to different lists of parts", () => {
    fc.assert(
      fc.property(parts, parts, ([firstA, restA], [firstB, restB]) => {
        const a: Parts = [firstA, ...restA];
        const b: Parts = [firstB, ...restB];
        fc.pre(JSON.stringify(a) !== JSON.stringify(b));
        expect(fingerprintOf(a)).not.toBe(fingerprintOf(b));
      }),
      runOptions,
    );
  });
});
