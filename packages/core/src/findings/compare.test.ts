import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { compareFindings } from "./compare.js";
import { FindingSchema } from "./finding.js";
import type { Finding } from "./finding.js";
import { minimalFinding } from "./samples.test-support.js";

// Fixed seed, so a failure reproduces (04-testing.md, "Determinismo").
const runOptions = { seed: 20261012, numRuns: 500 };

interface FindingKeys {
  fingerprint?: string;
  ruleId?: string;
  location?: { file: string; line?: number; column?: number };
}

function finding(keys: FindingKeys): Finding {
  return FindingSchema.parse({ ...minimalFinding(), ...keys });
}

function hex16(n: number): string {
  return n.toString(16).padStart(16, "0");
}

// Few distinct values, so many findings share a file, line, column or rule and
// every tie-break is exercised.
const location = fc.record(
  {
    file: fc.constantFrom("a.spec.ts", "b.spec.ts", "B.spec.ts", "é.spec.ts"),
    line: fc.integer({ min: 1, max: 3 }),
    column: fc.integer({ min: 1, max: 3 }),
  },
  { requiredKeys: ["file"] },
);
const keys = fc.record(
  {
    fingerprint: fc.integer({ min: 0, max: 0xffff }).map(hex16),
    ruleId: fc.constantFrom("E2E001", "E2E002", "FLAKY001"),
    location,
  },
  { requiredKeys: ["fingerprint", "ruleId"] },
);
const anyFinding = keys.map(finding);
// The fingerprint is the identity of a finding (ADR-0004), so a list never
// holds two findings with the same one. Findings that compare equal are then
// the same finding, and any input order sorts to the same result.
const findings = fc
  .uniqueArray(keys, { selector: (k) => k.fingerprint, maxLength: 30 })
  .map((list) => list.map(finding));

describe("compareFindings", () => {
  it("sorts the same findings to the same result from any initial order", () => {
    fc.assert(
      fc.property(
        findings.chain((list) =>
          fc.tuple(fc.constant(list), fc.shuffledSubarray(list, { minLength: list.length })),
        ),
        ([list, shuffled]) => {
          expect(shuffled.toSorted(compareFindings)).toEqual(list.toSorted(compareFindings));
        },
      ),
      runOptions,
    );
  });

  it("puts findings without location after every finding with one", () => {
    fc.assert(
      fc.property(findings, (list) => {
        const located = list.toSorted(compareFindings).map((item) => item.location !== undefined);
        expect(located).toEqual(located.toSorted((a, b) => Number(b) - Number(a)));
      }),
      runOptions,
    );
  });

  it("is a consistent order: reflexive, antisymmetric and transitive", () => {
    fc.assert(
      fc.property(anyFinding, anyFinding, anyFinding, (first, second, third) => {
        expect(compareFindings(first, first)).toBe(0);
        expect(Math.sign(compareFindings(first, second))).toBe(
          -Math.sign(compareFindings(second, first)),
        );
        if (compareFindings(first, second) <= 0 && compareFindings(second, third) <= 0) {
          expect(compareFindings(first, third)).toBeLessThanOrEqual(0);
        }
      }),
      runOptions,
    );
  });

  it.each<[string, FindingKeys, FindingKeys]>([
    [
      "file",
      { location: { file: "a.spec.ts", line: 9 } },
      { location: { file: "b.spec.ts", line: 1 } },
    ],
    [
      "line",
      { location: { file: "a.spec.ts", line: 2, column: 9 } },
      { location: { file: "a.spec.ts", line: 10, column: 1 } },
    ],
    [
      "column",
      { ruleId: "Z", location: { file: "a.spec.ts", line: 1, column: 2 } },
      { ruleId: "A", location: { file: "a.spec.ts", line: 1, column: 10 } },
    ],
    [
      "ruleId",
      { ruleId: "E2E001", fingerprint: "ffffffffffffffff" },
      { ruleId: "E2E002", fingerprint: "0000000000000000" },
    ],
    ["fingerprint", { fingerprint: "0000000000000001" }, { fingerprint: "0000000000000002" }],
    ["a present location before a missing one", { location: { file: "z.spec.ts" } }, {}],
    [
      "a present line before a missing one",
      { location: { file: "a.spec.ts", line: 99 } },
      { location: { file: "a.spec.ts" } },
    ],
    [
      "a present column before a missing one",
      { location: { file: "a.spec.ts", line: 1, column: 99 } },
      { location: { file: "a.spec.ts", line: 1 } },
    ],
    [
      "UTF-16 code units, not locale (Z before a)",
      { location: { file: "Z.ts" } },
      { location: { file: "a.ts" } },
    ],
    [
      "UTF-16 code units, not locale (z before é)",
      { location: { file: "z.ts" } },
      { location: { file: "é.ts" } },
    ],
  ])("orders by %s", (_label, first, second) => {
    expect(compareFindings(finding(first), finding(second))).toBeLessThan(0);
    expect(compareFindings(finding(second), finding(first))).toBeGreaterThan(0);
  });

  it("orders findings without location by ruleId and fingerprint", () => {
    const list = [
      finding({ ruleId: "E2E002", fingerprint: "0000000000000001" }),
      finding({ ruleId: "E2E001", fingerprint: "0000000000000003" }),
      finding({ ruleId: "E2E001", fingerprint: "0000000000000002" }),
    ];

    expect(list.toSorted(compareFindings).map((item) => item.fingerprint)).toEqual([
      "0000000000000002",
      "0000000000000003",
      "0000000000000001",
    ]);
  });

  it("returns 0 for findings with the same location, rule and fingerprint", () => {
    const location = { file: "a.spec.ts", line: 1, column: 1 };

    expect(
      compareFindings(
        FindingSchema.parse({ ...minimalFinding(), location, message: "One" }),
        FindingSchema.parse({ ...minimalFinding(), location, message: "Other" }),
      ),
    ).toBe(0);
  });
});
