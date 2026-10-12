import { distance } from "fastest-levenshtein";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { CONFIG_SUGGESTION_MAX_DISTANCE } from "../defaults.js";
import { suggestKey } from "./suggest.js";

// Fixed seed, so a failure reproduces (04-testing.md, "Determinismo").
const runOptions = { seed: 20261012, numRuns: 500 };

const TOP_LEVEL_KEYS = [
  "adapters",
  "plugins",
  "storage",
  "network",
  "analyzers",
  "quarantine",
  "gate",
  "redact",
  "llm",
];

describe("suggestKey", () => {
  it.each([
    ["two swapped letters", "storgae", "storage"],
    ["a missing letter", "plugin", "plugins"],
    ["a wrong letter", "analizers", "analyzers"],
    ["a different case", "Storage", "storage"],
    ["an extra letter", "redactt", "redact"],
  ])("suggests the known key for %s", (_case, key, expected) => {
    expect(suggestKey(key, TOP_LEVEL_KEYS)).toBe(expected);
  });

  it("suggests nothing when every known key is too far", () => {
    expect(suggestKey("reporters", TOP_LEVEL_KEYS)).toBeUndefined();
  });

  it("suggests nothing without candidates", () => {
    expect(suggestKey("storage", [])).toBeUndefined();
  });

  it("prefers the closest key and, on a tie, the first one", () => {
    expect(suggestKey("ab", ["xy", "ax", "ay", "ab"])).toBe("ab");
    expect(suggestKey("ab", ["ax", "ay"])).toBe("ax");
  });

  it("suggests nothing for a key much longer than every candidate", () => {
    expect(suggestKey("s".repeat(100_000), TOP_LEVEL_KEYS)).toBeUndefined();
  });

  it("only ever suggests a candidate within the maximum distance", () => {
    fc.assert(
      fc.property(fc.string(), fc.array(fc.string(), { maxLength: 8 }), (key, candidates) => {
        const suggestion = suggestKey(key, candidates);
        if (suggestion !== undefined) {
          expect(candidates).toContain(suggestion);
          expect(distance(key.toLowerCase(), suggestion.toLowerCase())).toBeLessThanOrEqual(
            CONFIG_SUGGESTION_MAX_DISTANCE,
          );
        }
      }),
      runOptions,
    );
  });

  it("returns a candidate at the smallest distance of all", () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: 12 }),
        fc.array(fc.string({ maxLength: 12 }), { maxLength: 8 }),
        (key, candidates) => {
          const suggestion = suggestKey(key, candidates);
          const distances = candidates.map((candidate) =>
            distance(key.toLowerCase(), candidate.toLowerCase()),
          );
          const best = Math.min(...distances);
          if (best <= CONFIG_SUGGESTION_MAX_DISTANCE) {
            expect(suggestion).toBe(candidates[distances.indexOf(best)]);
          } else {
            expect(suggestion).toBeUndefined();
          }
        },
      ),
      runOptions,
    );
  });
});
