import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  lintFingerprint,
  lintFingerprints,
  normalizeNodeCode,
  type LintFindingInput,
  type LintFingerprintParts,
} from "./lint-fingerprint.js";

// Fixed seed, so a failure reproduces (04-testing.md, "Determinismo").
const runOptions = { seed: 20261113, numRuns: 300 };

const WHITESPACE = [" ", "\t", "\n", "\r\n"] as const;

function parts(overrides: Partial<LintFingerprintParts> = {}): LintFingerprintParts {
  return {
    ruleId: "E2E001",
    file: "tests/cart.spec.ts",
    titlePath: ["cart", "checkout"],
    nodeCode: "page.waitForTimeout(1000)",
    occurrence: 0,
    ...overrides,
  };
}

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

/** Moves every finding at or after `line` down by `count` lines, as inserting lines there does. */
function insertLines(
  findings: readonly LintFindingInput[],
  line: number,
  count: number,
): LintFindingInput[] {
  return findings.map((f) => (f.line >= line ? { ...f, line: f.line + count } : f));
}

// Code without whitespace or `'`, so normalizing it is the identity (03-linter.md §11.5).
const plainCode = fc.string({ minLength: 1 }).filter((s) => !/[\s']/.test(s));

const titlePath = fc.array(fc.string(), { maxLength: 4 });

// A small pool of parts, so the generated findings often repeat and need occurrence indexes.
const pooledFinding = fc.record({
  ruleId: fc.constantFrom("E2E001", "E2E004"),
  file: fc.constantFrom("tests/cart.spec.ts", "tests/login.spec.ts"),
  titlePath: fc.constantFrom<readonly string[]>([], ["cart"], ["cart", "checkout"]),
  nodeCode: fc.constantFrom("page.waitForTimeout(1000)", "page.locator('.btn').nth(2)"),
  line: fc.integer({ min: 1, max: 500 }),
  column: fc.integer({ min: 1, max: 120 }),
});

describe("normalizeNodeCode", () => {
  it.each([
    ["page.locator( '.btn' )", 'page.locator(".btn")'],
    ["a(b,\n  c)", "a(b,c)"],
    ["\tpage.click()\r\n", "page.click()"],
    ["a b", "ab"],
    ["a /* keep me */ b", "a/*keepme*/b"],
    ["`a ${b}`", "`a${b}`"],
  ])("AC-1: normalizes %j to %j (whitespace removed, ' turned into \")", (code, expected) => {
    expect(normalizeNodeCode(code)).toBe(expected);
  });

  it("AC-1: does not apply Unicode normalization", () => {
    expect(normalizeNodeCode("é")).not.toBe(normalizeNodeCode("é"));
  });

  it("AC-3: normalizes \\r\\n and \\n to the same text", () => {
    expect(normalizeNodeCode("a(\r\n  b)")).toBe(normalizeNodeCode("a(\n  b)"));
  });
});

describe("lintFingerprint", () => {
  it("AC-1: hashes sha1 of the five normalized parts encoded with JSON.stringify", () => {
    // printf '%s' '["E2E004","tests/cart.spec.ts","cart › checkout","page.locator(\".cart.item\").first()","1"]' | shasum -a 1
    const fingerprint = lintFingerprint({
      ruleId: "E2E004",
      file: "tests/cart.spec.ts",
      titlePath: ["cart", "checkout"],
      nodeCode: "page.locator( '.cart  .item' )\r\n\t.first()",
      occurrence: 1,
    });

    expect(fingerprint).toBe("fbef6886bb2513c7");
  });

  it("AC-1: keeps the fingerprint when spaces, tabs, \\n or \\r\\n are added anywhere in the node", () => {
    const insertions = fc.array(fc.tuple(fc.nat(), fc.constantFrom(...WHITESPACE)), {
      minLength: 1,
      maxLength: 8,
    });
    fc.assert(
      fc.property(fc.string(), insertions, (code, inserts) => {
        const spaced = inserts.reduce((acc, [at, ws]) => {
          const i = at % (acc.length + 1);
          return acc.slice(0, i) + ws + acc.slice(i);
        }, code);

        expect(lintFingerprint(parts({ nodeCode: spaced }))).toBe(
          lintFingerprint(parts({ nodeCode: code })),
        );
      }),
      runOptions,
    );
  });

  it("AC-1: changes the fingerprint when the rule changes", () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (a, b) => {
        fc.pre(a !== b);
        expect(lintFingerprint(parts({ ruleId: a }))).not.toBe(
          lintFingerprint(parts({ ruleId: b })),
        );
      }),
      runOptions,
    );
  });

  it("AC-1: changes the fingerprint when the file changes", () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (a, b) => {
        fc.pre(a !== b);
        expect(lintFingerprint(parts({ file: a }))).not.toBe(lintFingerprint(parts({ file: b })));
      }),
      runOptions,
    );
  });

  it("AC-1: changes the fingerprint when the titlePath joined with ' › ' changes", () => {
    fc.assert(
      fc.property(titlePath, titlePath, (a, b) => {
        fc.pre(a.join(" › ") !== b.join(" › "));
        expect(lintFingerprint(parts({ titlePath: a }))).not.toBe(
          lintFingerprint(parts({ titlePath: b })),
        );
      }),
      runOptions,
    );
  });

  it("AC-1: changes the fingerprint when the normalized node code changes", () => {
    fc.assert(
      fc.property(plainCode, plainCode, (a, b) => {
        fc.pre(a !== b);
        expect(lintFingerprint(parts({ nodeCode: a }))).not.toBe(
          lintFingerprint(parts({ nodeCode: b })),
        );
      }),
      runOptions,
    );
  });

  it("AC-1: changes the fingerprint when the occurrence changes", () => {
    fc.assert(
      fc.property(fc.nat(), fc.nat(), (a, b) => {
        fc.pre(a !== b);
        expect(lintFingerprint(parts({ occurrence: a }))).not.toBe(
          lintFingerprint(parts({ occurrence: b })),
        );
      }),
      runOptions,
    );
  });

  it("AC-3: gives the same fingerprint to a node with \\r\\n and with \\n", () => {
    const crlf = lintFingerprint(parts({ nodeCode: "await page.waitForTimeout(\r\n  1000,\r\n)" }));
    const lf = lintFingerprint(parts({ nodeCode: "await page.waitForTimeout(\n  1000,\n)" }));

    expect(crlf).toBe(lf);
  });
});

describe("lintFingerprints", () => {
  it("AC-1: keeps every fingerprint when lines are inserted before any line", () => {
    fc.assert(
      fc.property(
        fc.array(pooledFinding, { maxLength: 12 }),
        fc.integer({ min: 1, max: 600 }),
        fc.integer({ min: 1, max: 50 }),
        (findings, at, count) => {
          expect(lintFingerprints(insertLines(findings, at, count))).toEqual(
            lintFingerprints(findings),
          );
        },
      ),
      runOptions,
    );
  });

  it("AC-2: returns no fingerprints for no findings", () => {
    expect(lintFingerprints([])).toEqual([]);
  });

  it("AC-2: gives two identical findings in the same test distinct fingerprints numbered by position", () => {
    const first = finding({ line: 10 });
    const second = finding({ line: 20 });

    const fingerprints = lintFingerprints([first, second]);

    expect(fingerprints).toEqual([
      lintFingerprint(parts({ occurrence: 0 })),
      lintFingerprint(parts({ occurrence: 1 })),
    ]);
    expect(fingerprints[0]).not.toBe(fingerprints[1]);
  });

  it("AC-2: keeps the fingerprints of two identical findings when the input order is reversed", () => {
    const first = finding({ line: 10 });
    const second = finding({ line: 20 });

    const reversed = lintFingerprints([second, first]);

    expect(reversed).toEqual(lintFingerprints([first, second]).reverse());
    expect(reversed[1]).toBe(lintFingerprint(parts({ occurrence: 0 })));
  });

  it("AC-2: keeps the fingerprints of two identical findings when their lines move", () => {
    const before = lintFingerprints([finding({ line: 10 }), finding({ line: 20 })]);

    const after = lintFingerprints([finding({ line: 13 }), finding({ line: 40 })]);

    expect(after).toEqual(before);
  });

  it("AC-2: numbers identical findings on the same line by column", () => {
    const right = finding({ line: 10, column: 30 });
    const left = finding({ line: 10, column: 5 });

    expect(lintFingerprints([right, left])).toEqual([
      lintFingerprint(parts({ occurrence: 1 })),
      lintFingerprint(parts({ occurrence: 0 })),
    ]);
  });

  it("AC-2: numbers identical findings at the same position in input order", () => {
    const same = finding({ line: 10, column: 5 });

    expect(lintFingerprints([same, { ...same }])).toEqual([
      lintFingerprint(parts({ occurrence: 0 })),
      lintFingerprint(parts({ occurrence: 1 })),
    ]);
  });

  it("AC-2: does not renumber a describe's hook findings when the same finding appears in another describe", () => {
    // Hooks of describe "cart": titlePath is the enclosing describes (03-linter.md §11.5).
    const cartHooks = [
      finding({ titlePath: ["cart"], line: 5 }),
      finding({ titlePath: ["cart"], line: 8 }),
    ];
    const before = lintFingerprints(cartHooks);

    // A new identical finding in a hook of describe "checkout", one line above them.
    const added = finding({ titlePath: ["checkout"], line: 2 });
    const after = lintFingerprints([added, ...insertLines(cartHooks, 2, 1)]);

    expect(after.slice(1)).toEqual(before);
    expect(after[0]).toBe(lintFingerprint(parts({ titlePath: ["checkout"], occurrence: 0 })));
  });

  it("AC-3: gives the same fingerprints to findings whose node uses \\r\\n or \\n", () => {
    const crlf = lintFingerprints([finding({ nodeCode: "a(\r\n  b)" })]);
    const lf = lintFingerprints([finding({ nodeCode: "a(\n  b)" })]);

    expect(crlf).toEqual(lf);
  });
});
