import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  lintFingerprint,
  lintFingerprints,
  type LintFindingInput,
  type LintFingerprintParts,
} from "./lint-fingerprint.js";

// Fixed seed, so a failure reproduces (04-testing.md, "Determinismo").
const runOptions = { seed: 20261113, numRuns: 300 };

function finding(overrides: Partial<LintFindingInput> = {}): LintFindingInput {
  return {
    ruleId: "E2E001",
    file: "tests/cart.spec.ts",
    titlePath: ["cart", "checkout"],
    nodeCode: "page.waitForTimeout(1000)",
    line: 10,
    column: 5,
    ...overrides,
  };
}

function occurrenceFp(
  overrides: Partial<LintFingerprintParts>,
  occurrence: number,
): ReturnType<typeof lintFingerprint> {
  return lintFingerprint({
    ruleId: "E2E001",
    file: "tests/cart.spec.ts",
    titlePath: ["cart", "checkout"],
    nodeCode: "page.waitForTimeout(1000)",
    occurrence,
    ...overrides,
  });
}

// Small pool of parts so repeated findings are the norm; positions collide often too.
const pooledFinding = fc.record({
  ruleId: fc.constantFrom("E2E001", "E2E004"),
  file: fc.constantFrom("tests/cart.spec.ts", "tests\\cart.spec.ts"),
  titlePath: fc.constantFrom<readonly string[]>([], [""], ["cart"], ["a › b"], ["a", "b"]),
  nodeCode: fc.constantFrom("a('x')", 'a("x")', "a( 'x' )", "b()"),
  line: fc.integer({ min: 1, max: 3 }),
  column: fc.integer({ min: 1, max: 3 }),
});

describe("lintFingerprints (edge cases)", () => {
  it("never returns two equal fingerprints and returns one per input", () => {
    fc.assert(
      fc.property(fc.array(pooledFinding, { maxLength: 40 }), (findings) => {
        const result = lintFingerprints(findings);

        expect(result).toHaveLength(findings.length);
        expect(new Set(result).size).toBe(findings.length);
      }),
      runOptions,
    );
  });

  it("is deterministic for the same input", () => {
    fc.assert(
      fc.property(fc.array(pooledFinding, { maxLength: 20 }), (findings) => {
        expect(lintFingerprints(findings)).toEqual(lintFingerprints(findings));
      }),
      runOptions,
    );
  });

  it("gives the same fingerprints to findings at distinct positions when the input is shuffled", () => {
    const distinct = fc
      .uniqueArray(fc.tuple(fc.integer({ min: 1, max: 20 }), fc.integer({ min: 1, max: 20 })), {
        maxLength: 10,
        selector: ([l, c]) => String(l) + ":" + String(c),
      })
      .chain((positions) =>
        fc.tuple(
          fc.tuple(
            ...positions.map(([line, column]) =>
              pooledFinding.map((f) => ({ ...f, line, column })),
            ),
          ),
          fc.shuffledSubarray(
            positions.map((_, i) => i),
            {
              minLength: positions.length,
              maxLength: positions.length,
            },
          ),
        ),
      );
    fc.assert(
      fc.property(distinct, ([findings, order]) => {
        const base = lintFingerprints(findings);

        const shuffled = lintFingerprints(order.map((i) => findings[i] as LintFindingInput));

        expect(shuffled).toEqual(order.map((i) => base[i]));
      }),
      runOptions,
    );
  });

  it("numbers findings at the same position in input order when their parts differ only by normalization", () => {
    const quotes = finding({ nodeCode: "a('x')" });
    const doubleQuotes = finding({ nodeCode: 'a("x")' });
    const spaced = finding({ nodeCode: "a( 'x' )" });

    expect(lintFingerprints([quotes, doubleQuotes, spaced])).toEqual([
      occurrenceFp({ nodeCode: "a('x')" }, 0),
      occurrenceFp({ nodeCode: "a('x')" }, 1),
      occurrenceFp({ nodeCode: "a('x')" }, 2),
    ]);
    // Reversing the input reverses nothing about the numbering: first in input gets 0.
    const reversed = lintFingerprints([spaced, doubleQuotes, quotes]);
    expect(reversed).toEqual(lintFingerprints([quotes, doubleQuotes, spaced]));
  });

  it("numbers by position first and input order only as a tie-break", () => {
    const late = finding({ line: 9, column: 1, nodeCode: "a('x')" });
    const earlyA = finding({ line: 2, column: 1, nodeCode: 'a("x")' });
    const earlyB = finding({ line: 2, column: 1, nodeCode: "a( 'x' )" });

    // earlyA and earlyB tie on position: input order decides (A=0, B=1); late is 2.
    expect(lintFingerprints([late, earlyA, earlyB])).toEqual([
      occurrenceFp({ nodeCode: "a('x')" }, 2),
      occurrenceFp({ nodeCode: "a('x')" }, 0),
      occurrenceFp({ nodeCode: "a('x')" }, 1),
    ]);
  });

  it("groups titlePath ['a › b'] with ['a', 'b'], like the hash does", () => {
    const joined = finding({ titlePath: ["a › b"] });
    const split = finding({ titlePath: ["a", "b"] });

    expect(lintFingerprints([joined, split])).toEqual([
      occurrenceFp({ titlePath: ["a", "b"] }, 0),
      occurrenceFp({ titlePath: ["a", "b"] }, 1),
    ]);
  });

  it("groups an empty titlePath with [''] because both join to the empty string", () => {
    const fingerprints = lintFingerprints([
      finding({ titlePath: [] }),
      finding({ titlePath: [""] }),
    ]);

    expect(fingerprints).toEqual([
      occurrenceFp({ titlePath: [] }, 0),
      occurrenceFp({ titlePath: [] }, 1),
    ]);
  });

  it.each([
    ["ruleId and file", { ruleId: "a|b", file: "c" }, { ruleId: "a", file: "b|c" }],
    ["file and titlePath", { file: "a\u0000b", titlePath: [] }, { file: "a", titlePath: ["b"] }],
    [
      "titlePath and nodeCode",
      { titlePath: ["a"], nodeCode: "b" },
      { titlePath: [], nodeCode: "ab" },
    ],
    ["quote characters", { file: 'a","b' }, { file: "a", titlePath: ["b"] }],
  ] satisfies [string, Partial<LintFingerprintParts>, Partial<LintFingerprintParts>][])(
    "does not group findings whose %s only collide with a literal separator",
    (_name, x, y) => {
      const fingerprints = lintFingerprints([finding(x), finding(y)]);

      // Different groups: both are occurrence 0 of their own parts.
      expect(fingerprints).toEqual([occurrenceFp(x, 0), occurrenceFp(y, 0)]);
    },
  );

  it("does not group Windows-style and POSIX paths", () => {
    const fingerprints = lintFingerprints([
      finding({ file: "tests\\cart.spec.ts" }),
      finding({ file: "tests/cart.spec.ts" }),
    ]);

    expect(fingerprints).toEqual([
      occurrenceFp({ file: "tests\\cart.spec.ts" }, 0),
      occurrenceFp({ file: "tests/cart.spec.ts" }, 0),
    ]);
  });

  it("does not group titles that differ only by Unicode normalization form", () => {
    const fingerprints = lintFingerprints([
      finding({ titlePath: ["café"] }),
      finding({ titlePath: ["café"] }),
    ]);

    expect(fingerprints[0]).not.toBe(fingerprints[1]);
    expect(fingerprints[0]).toBe(occurrenceFp({ titlePath: ["café"] }, 0));
    expect(fingerprints[1]).toBe(occurrenceFp({ titlePath: ["café"] }, 0));
  });

  it("does not mutate the input array or its findings", () => {
    const findings = [
      finding({ line: 30, titlePath: ["a", "b"] }),
      finding({ line: 5, titlePath: ["a", "b"] }),
      finding({ line: 5, column: 1 }),
    ];
    const snapshot = structuredClone(findings);
    for (const f of findings) {
      Object.freeze(f.titlePath);
      Object.freeze(f);
    }
    Object.freeze(findings);

    lintFingerprints(findings);

    expect(findings).toEqual(snapshot);
  });

  it("handles a large list of identical findings with consecutive occurrences", () => {
    const findings = Array.from({ length: 2000 }, (_, i) => finding({ line: i + 1 }));

    const result = lintFingerprints(findings);

    expect(new Set(result).size).toBe(2000);
    expect(result[0]).toBe(occurrenceFp({}, 0));
    expect(result[1999]).toBe(occurrenceFp({}, 1999));
  });

  it("returns 16 lowercase hex characters for empty and Unicode parts", () => {
    const result = lintFingerprints([
      finding({ ruleId: "", file: "", titlePath: [], nodeCode: "" }),
      finding({ titlePath: ["日本語 🧪"], nodeCode: "  x" }),
    ]);

    expect(result).toEqual([
      expect.stringMatching(/^[0-9a-f]{16}$/u),
      expect.stringMatching(/^[0-9a-f]{16}$/u),
    ]);
  });
});
