import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { AtiumError } from "../errors.js";
import { compareFindings } from "../findings/compare.js";
import { FINDING_SEVERITIES } from "../findings/finding.js";
import { ruleDocsUrl } from "../findings/docs-url.js";
import { BASELINE_STATES } from "../model/report.js";
import type { BaselineState, ReportFinding, RuleDescriptor } from "../model/report.js";
import type { SkippedAnalyzer } from "../pipeline/run-analyzers.js";
import { aFinding } from "../testing/finding-builder.js";
import type { FindingBuilder } from "../testing/finding-builder.js";
import { createReport } from "./create-report.js";
import type { CreateReportInput } from "./create-report.js";

// Expected values come from 13-score-baseline-reports.md §21.5 and the order of
// `compareFindings` in 14-architecture.md §22.3, worked out by hand.

type FindingPatch = Parameters<FindingBuilder["with"]>[0];

// Fixed seed, so a failure reproduces (04-testing.md, "Determinismo").
const runOptions = { seed: 20261113, numRuns: 100 };

function input(overrides: Partial<CreateReportInput> = {}): CreateReportInput {
  return { toolVersion: "1.4.0", findings: [], rules: [], skipped: [], ...overrides };
}

function hex16(n: number): string {
  return n.toString(16).padStart(16, "0");
}

/** A finding of the report, identified by `id` (its fingerprint is `hex16(id)`). */
function finding(
  id: number,
  patch: FindingPatch = {},
  state: BaselineState = "new",
): ReportFinding {
  return {
    ...aFinding()
      .with({ fingerprint: hex16(id), ...patch })
      .build(),
    baselineState: state,
  };
}

function rule(id: string, extra: Partial<RuleDescriptor> = {}): RuleDescriptor {
  return { id, name: `rule-${id.toLowerCase()}`, shortDescription: `Title of ${id}`, ...extra };
}

/** UTF-16 code unit order, without locale (§21.5). */
function byCodeUnits(a: string, b: string): number {
  return Number(a > b) - Number(a < b);
}

const timeoutError = new AtiumError("ANALYZER_TIMEOUT", "triage did not finish in 30000 ms.");

describe("createReport", () => {
  it("writes schemaVersion 1 and the tool version it receives", () => {
    const report = createReport(input({ toolVersion: "1.4.0" }));

    expect(report.schemaVersion).toBe(1);
    expect(report.toolVersion).toBe("1.4.0");
  });

  it("orders findings by file, line, column, rule and fingerprint, missing values last, by UTF-16 code units (§22.3)", () => {
    const at = (file: string, line?: number, column?: number): FindingPatch => ({
      location: {
        file,
        ...(line === undefined ? {} : { line }),
        ...(column === undefined ? {} : { column }),
      },
    });
    const noLocation = finding(1);
    const fileOnly = finding(2, at("a.spec.ts"));
    const line10 = finding(3, at("a.spec.ts", 10, 1));
    const line2NoColumn = finding(4, at("a.spec.ts", 2));
    const line2RuleE2E002 = finding(5, { ...at("a.spec.ts", 2, 5), ruleId: "E2E002" });
    const line2Fingerprint15 = finding(15, at("a.spec.ts", 2, 5), "unchanged");
    const line2Fingerprint10 = finding(10, at("a.spec.ts", 2, 5));
    const otherFile = finding(6, at("b.spec.ts", 1, 1));
    const upperCaseFile = finding(7, at("B.spec.ts", 99, 1));

    const report = createReport(
      input({
        findings: [
          noLocation,
          otherFile,
          fileOnly,
          line10,
          line2RuleE2E002,
          line2NoColumn,
          line2Fingerprint15,
          upperCaseFile,
          line2Fingerprint10,
        ],
      }),
    );

    expect(report.findings).toStrictEqual([
      upperCaseFile,
      line2Fingerprint10,
      line2Fingerprint15,
      line2RuleE2E002,
      line2NoColumn,
      line10,
      fileOnly,
      otherFile,
      noLocation,
    ]);
  });

  it("counts every finding and the new ones overall, by severity and by rule", () => {
    const findings = [
      finding(1, { ruleId: "E2E002", severity: "error" }, "new"),
      finding(2, { ruleId: "E2E001", severity: "warning" }, "unchanged"),
      finding(3, { ruleId: "E2E001", severity: "warning" }, "new"),
      finding(4, { ruleId: "FLAKY001", severity: "error" }, "unchanged"),
      finding(5, { ruleId: "E2E001", severity: "error" }, "new"),
    ];

    const report = createReport(input({ findings }));

    expect(report.summary).toStrictEqual({
      overall: { total: 5, new: 3 },
      bySeverity: {
        error: { total: 3, new: 2 },
        warning: { total: 2, new: 1 },
        info: { total: 0, new: 0 },
      },
      byRule: [
        { ruleId: "E2E001", total: 3, new: 2 },
        { ruleId: "E2E002", total: 1, new: 1 },
        { ruleId: "FLAKY001", total: 1, new: 0 },
      ],
    });
  });

  it("summarizes a report without findings with zero for every severity and no byRule entry", () => {
    const report = createReport(input({ rules: [rule("E2E001")] }));

    expect(report.findings).toStrictEqual([]);
    expect(report.summary).toStrictEqual({
      overall: { total: 0, new: 0 },
      bySeverity: {
        error: { total: 0, new: 0 },
        warning: { total: 0, new: 0 },
        info: { total: 0, new: 0 },
      },
      byRule: [],
    });
  });

  it("lists in byRule only the rules with findings, with or without a descriptor", () => {
    const findings = [finding(1, { ruleId: "PLUGIN001" }), finding(2, { ruleId: "E2E001" })];

    const report = createReport(input({ findings, rules: [rule("E2E001"), rule("E2E009")] }));

    expect(report.summary.byRule.map((entry) => entry.ruleId)).toEqual(["E2E001", "PLUGIN001"]);
  });

  it("orders byRule by UTF-16 code units, not by locale", () => {
    const findings = [
      finding(1, { ruleId: "a-plugin-rule" }),
      finding(2, { ruleId: "E2E001" }),
      finding(3, { ruleId: "B-plugin-rule" }),
    ];

    const report = createReport(input({ findings }));

    expect(report.summary.byRule.map((entry) => entry.ruleId)).toEqual([
      "B-plugin-rule",
      "E2E001",
      "a-plugin-rule",
    ]);
  });

  it("orders rules by id by UTF-16 code units and keeps each descriptor as given", () => {
    const flaky = rule("FLAKY001");
    const withDocs = rule("E2E010", { docsUrl: ruleDocsUrl("E2E010") });
    const e2e002 = rule("E2E002");
    const lowerCase = rule("a-plugin-rule");

    const report = createReport(input({ rules: [flaky, lowerCase, withDocs, e2e002] }));

    expect(report.rules).toStrictEqual([e2e002, withDocs, flaky, lowerCase]);
  });

  it("throws an Error that names the id when two rule descriptors share it", () => {
    const rules = [rule("E2E005"), rule("E2E001"), rule("E2E005", { name: "other-name" })];

    expect(() => createReport(input({ rules }))).toThrow(/E2E005/);
  });

  it.each<[string, SkippedAnalyzer["reason"], Record<string, unknown>]>([
    [
      "missing-capabilities",
      { kind: "missing-capabilities", missing: ["network"] },
      { reason: "missing-capabilities", missing: ["network"] },
    ],
    ["duplicate-id", { kind: "duplicate-id" }, { reason: "duplicate-id" }],
    [
      "invalid-config",
      { kind: "invalid-config", error: new AtiumError("CONFIG_INVALID", "flaky.window: -1") },
      { reason: "invalid-config" },
    ],
    ["timeout", { kind: "timeout", error: timeoutError }, { reason: "timeout" }],
    ["failed", { kind: "failed", error: new Error("boom") }, { reason: "failed" }],
    ["aborted", { kind: "aborted", error: "user cancelled" }, { reason: "aborted" }],
  ])(
    "keeps only the kind of a %s skip, without its error (ADR-0027)",
    (_kind, reason, expected) => {
      const report = createReport(input({ skipped: [{ analyzer: "flaky", reason }] }));

      expect(report.skippedAnalyzers).toStrictEqual([{ analyzer: "flaky", ...expected }]);
    },
  );

  it("leaves no error text in the JSON of the report", () => {
    const skipped: SkippedAnalyzer[] = [
      { analyzer: "flaky", reason: { kind: "failed", error: new Error("token=s3cr3t-a") } },
      {
        analyzer: "triage",
        reason: { kind: "invalid-config", error: new AtiumError("CONFIG_INVALID", "s3cr3t-b") },
      },
    ];

    const json = JSON.stringify(createReport(input({ skipped })));

    expect(json).not.toContain("s3cr3t");
  });

  it("lists the missing capabilities in the order of CAPABILITIES", () => {
    const skipped: SkippedAnalyzer[] = [
      {
        analyzer: "gaps",
        reason: { kind: "missing-capabilities", missing: ["openapi", "history", "git"] },
      },
    ];

    const report = createReport(input({ skipped }));

    expect(report.skippedAnalyzers).toStrictEqual([
      { analyzer: "gaps", reason: "missing-capabilities", missing: ["history", "git", "openapi"] },
    ]);
  });

  it("orders skipped analyzers by analyzer and then by reason, by UTF-16 code units", () => {
    const skipped: SkippedAnalyzer[] = [
      { analyzer: "triage", reason: { kind: "failed", error: new Error("boom") } },
      { analyzer: "flaky", reason: { kind: "missing-capabilities", missing: ["history"] } },
      { analyzer: "Network", reason: { kind: "timeout", error: timeoutError } },
      { analyzer: "flaky", reason: { kind: "duplicate-id" } },
    ];

    const report = createReport(input({ skipped }));

    expect(report.skippedAnalyzers).toStrictEqual([
      { analyzer: "Network", reason: "timeout" },
      { analyzer: "flaky", reason: "duplicate-id" },
      { analyzer: "flaky", reason: "missing-capabilities", missing: ["history"] },
      { analyzer: "triage", reason: "failed" },
    ]);
  });

  it.each<[string, Partial<CreateReportInput>]>([
    ["an empty toolVersion", { toolVersion: "" }],
    ["a rule with an empty name", { rules: [rule("E2E001", { name: "" })] }],
    [
      "a rule with a javascript: docsUrl",
      { rules: [rule("E2E001", { docsUrl: "javascript:alert(1)" })] },
    ],
    [
      "a skipped analyzer with an empty id",
      { skipped: [{ analyzer: "", reason: { kind: "duplicate-id" } }] },
    ],
    [
      "a skip for missing capabilities that lists none",
      { skipped: [{ analyzer: "gaps", reason: { kind: "missing-capabilities", missing: [] } }] },
    ],
  ])("throws a ZodError when the input has %s", (_label, overrides) => {
    expect(() => createReport(input(overrides))).toThrow(ZodError);
  });

  it("returns a frozen report", () => {
    const report = createReport(
      input({
        findings: [finding(1, { location: { file: "a.spec.ts", line: 1 } })],
        rules: [rule("E2E001")],
        skipped: [{ analyzer: "flaky", reason: { kind: "duplicate-id" } }],
      }),
    );

    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.findings)).toBe(true);
    expect(Object.isFrozen(report.findings[0])).toBe(true);
    expect(Object.isFrozen(report.summary)).toBe(true);
    expect(Object.isFrozen(report.summary.bySeverity)).toBe(true);
    expect(Object.isFrozen(report.summary.byRule)).toBe(true);
    expect(Object.isFrozen(report.rules)).toBe(true);
    expect(Object.isFrozen(report.skippedAnalyzers)).toBe(true);
  });

  it("does not change the arrays it receives", () => {
    const findings = [finding(2, { ruleId: "E2E002" }), finding(1)];
    const rules = [rule("E2E002"), rule("E2E001")];
    const missing: SkippedAnalyzer = {
      analyzer: "gaps",
      reason: { kind: "missing-capabilities", missing: ["openapi", "history"] },
    };
    const skipped: SkippedAnalyzer[] = [
      { analyzer: "triage", reason: { kind: "duplicate-id" } },
      missing,
    ];

    createReport(input({ findings, rules, skipped }));

    expect(findings.map((item) => item.ruleId)).toEqual(["E2E002", "E2E001"]);
    expect(rules.map((item) => item.id)).toEqual(["E2E002", "E2E001"]);
    expect(skipped.map((item) => item.analyzer)).toEqual(["triage", "gaps"]);
    expect(missing.reason).toStrictEqual({
      kind: "missing-capabilities",
      missing: ["openapi", "history"],
    });
  });
});

describe("createReport properties", () => {
  // Few distinct values, so findings share files, lines and rules.
  const patch = fc.record(
    {
      ruleId: fc.constantFrom("E2E001", "E2E002", "FLAKY001", "a-plugin-rule"),
      severity: fc.constantFrom(...FINDING_SEVERITIES),
      location: fc.record(
        {
          file: fc.constantFrom("a.spec.ts", "b.spec.ts", "B.spec.ts"),
          line: fc.integer({ min: 1, max: 3 }),
          column: fc.integer({ min: 1, max: 3 }),
        },
        { requiredKeys: ["file"] },
      ),
    },
    { requiredKeys: ["ruleId", "severity"] },
  );
  // The fingerprint is the identity of a finding (ADR-0004), so a list never repeats one.
  const findings = fc
    .uniqueArray(
      fc.tuple(fc.integer({ min: 0, max: 0xffff }), patch, fc.constantFrom(...BASELINE_STATES)),
      { selector: ([id]) => id, maxLength: 20 },
    )
    .map((list) => list.map(([id, fields, state]) => finding(id, fields, state)));

  it("summarizes any list of findings: totals, new ones, severities and rules add up", () => {
    fc.assert(
      fc.property(findings, (list) => {
        const report = createReport(input({ findings: list }));
        const { overall, bySeverity, byRule } = report.summary;
        const newCount = list.filter((item) => item.baselineState === "new").length;
        const severities = Object.values(bySeverity);
        const ruleIds = [...new Set(list.map((item) => item.ruleId))].toSorted(byCodeUnits);

        expect(overall).toStrictEqual({ total: list.length, new: newCount });
        expect(severities.reduce((sum, count) => sum + count.total, 0)).toBe(list.length);
        expect(severities.reduce((sum, count) => sum + count.new, 0)).toBe(newCount);
        expect(byRule.reduce((sum, entry) => sum + entry.total, 0)).toBe(list.length);
        expect(byRule.reduce((sum, entry) => sum + entry.new, 0)).toBe(newCount);
        expect(byRule.map((entry) => entry.ruleId)).toEqual(ruleIds);
      }),
      runOptions,
    );
  });

  it("orders any list of findings as compareFindings does and gives the same report from any input order", () => {
    fc.assert(
      fc.property(
        findings.chain((list) =>
          fc.tuple(fc.constant(list), fc.shuffledSubarray(list, { minLength: list.length })),
        ),
        ([list, shuffled]) => {
          const report = createReport(input({ findings: list }));

          expect(report.findings).toStrictEqual(list.toSorted(compareFindings));
          expect(createReport(input({ findings: shuffled }))).toStrictEqual(report);
        },
      ),
      runOptions,
    );
  });
});
