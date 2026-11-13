import { describe, expect, it } from "vitest";
import { AtiumError } from "../errors.js";
import { ruleDocsUrl } from "../findings/docs-url.js";
import { aFinding } from "../testing/finding-builder.js";
import { aReport } from "../testing/report-builder.js";
import { REPORT_SCHEMA_VERSION, ReportSchema } from "./report.js";
import type { Report } from "./report.js";
import { without } from "./samples.test-support.js";

// The report of 13-score-baseline-reports.md §21.5 (ADR-0027), built with the
// builders as the AC asks. Every case below starts from it and changes one thing.
function fullReport(): Report {
  return aReport()
    .withToolVersion("1.4.0")
    .withFinding(
      aFinding().with({
        location: { file: "tests/cart.spec.ts", line: 12, column: 5 },
        suggestion: { description: "Wait for the cart badge instead." },
        docsUrl: ruleDocsUrl("E2E001"),
      }),
      "new",
    )
    .withFinding(
      aFinding().with({
        fingerprint: "00000000000000ff",
        analyzer: "flaky",
        ruleId: "FLAKY001",
        severity: "error",
      }),
      "unchanged",
    )
    .withRule({
      id: "E2E001",
      name: "no-hard-wait",
      shortDescription: "Hard wait detected",
      docsUrl: ruleDocsUrl("E2E001"),
    })
    .withRule({ id: "FLAKY001", name: "flaky-test", shortDescription: "Flaky test" })
    .withSkipped({
      analyzer: "network",
      reason: { kind: "missing-capabilities", missing: ["network"] },
    })
    .withSkipped({
      analyzer: "triage",
      reason: { kind: "timeout", error: new AtiumError("ANALYZER_TIMEOUT", "triage timed out.") },
    })
    .build();
}

/** Item `index` of `list`; throws if it is missing, so a case never edits nothing. */
function nth<T>(list: readonly T[], index: number): T {
  const item = list[index];
  if (item === undefined) {
    throw new Error(`fullReport() has no item ${String(index)} here; update the test data.`);
  }
  return item;
}

type Change = (report: Report) => unknown;

describe("ReportSchema", () => {
  it("AC-1: accepts an empty report built with aReport", () => {
    const report = aReport().build();

    expect(ReportSchema.safeParse(report).success).toBe(true);
    expect(report.schemaVersion).toBe(REPORT_SCHEMA_VERSION);
  });

  it("AC-1: accepts a full report: both baseline states, rules with and without docsUrl, skipped analyzers with and without missing", () => {
    const report = fullReport();

    expect(ReportSchema.safeParse(report).success).toBe(true);
    expect(report.findings.map((finding) => finding.baselineState)).toEqual(["new", "unchanged"]);
    expect(report.rules.map((rule) => "docsUrl" in rule)).toEqual([true, false]);
    expect(report.skippedAnalyzers.map((entry) => "missing" in entry)).toEqual([true, false]);
  });

  it("AC-1: reads back a report from its JSON unchanged", () => {
    const report = fullReport();

    expect(ReportSchema.parse(JSON.parse(JSON.stringify(report)))).toStrictEqual(report);
  });

  it.each<[string, Change]>([
    [
      "a rule with an http docsUrl",
      (r) => ({
        ...r,
        rules: [{ ...nth(r.rules, 1), docsUrl: "http://localhost:3000/rules/flaky001" }],
      }),
    ],
    [
      "rules that do not describe every ruleId of the findings (§21.5)",
      (r) => ({ ...r, rules: [] }),
    ],
    [
      "several missing capabilities",
      (r) => ({
        ...r,
        skippedAnalyzers: [{ ...nth(r.skippedAnalyzers, 0), missing: ["history", "network"] }],
      }),
    ],
  ])("AC-1: accepts a report with %s", (_label, change) => {
    const input = change(fullReport());

    expect(ReportSchema.safeParse(input).success).toBe(true);
  });

  it.each<[string, Change]>([
    ["the report (generatedAt, ADR-0027)", (r) => ({ ...r, generatedAt: "2026-11-13T00:00:00Z" })],
    ["a finding", (r) => ({ ...r, findings: [{ ...nth(r.findings, 0), score: 3 }] })],
    ["the summary", (r) => ({ ...r, summary: { ...r.summary, average: 1 } })],
    [
      "summary.overall",
      (r) => ({ ...r, summary: { ...r.summary, overall: { ...r.summary.overall, fixed: 0 } } }),
    ],
    [
      "summary.bySeverity",
      (r) => ({
        ...r,
        summary: {
          ...r.summary,
          bySeverity: { ...r.summary.bySeverity, critical: { total: 0, new: 0 } },
        },
      }),
    ],
    [
      "a count of summary.bySeverity",
      (r) => ({
        ...r,
        summary: {
          ...r.summary,
          bySeverity: {
            ...r.summary.bySeverity,
            error: { ...r.summary.bySeverity.error, fixed: 0 },
          },
        },
      }),
    ],
    [
      "an entry of summary.byRule",
      (r) => ({
        ...r,
        summary: { ...r.summary, byRule: [{ ...nth(r.summary.byRule, 0), name: "no-hard-wait" }] },
      }),
    ],
    ["a rule", (r) => ({ ...r, rules: [{ ...nth(r.rules, 0), helpUri: "https://example.com" }] })],
    [
      "a skipped analyzer with missing capabilities",
      (r) => ({ ...r, skippedAnalyzers: [{ ...nth(r.skippedAnalyzers, 0), note: "x" }] }),
    ],
    [
      "a skipped analyzer: the error text (ADR-0027)",
      (r) => ({ ...r, skippedAnalyzers: [{ ...nth(r.skippedAnalyzers, 1), error: "boom" }] }),
    ],
    [
      "a skipped analyzer that is not missing capabilities: missing",
      (r) => ({
        ...r,
        skippedAnalyzers: [{ ...nth(r.skippedAnalyzers, 1), missing: ["network"] }],
      }),
    ],
  ])("AC-1: rejects an unknown field in %s", (_label, change) => {
    const input = change(fullReport());

    expect(ReportSchema.safeParse(input).success).toBe(false);
  });

  it("AC-1: rejects a report without schemaVersion", () => {
    const input = without(fullReport(), "schemaVersion");

    expect(ReportSchema.safeParse(input).success).toBe(false);
  });

  it.each([[2], [0], ["1"], [null]])("AC-1: rejects a report with schemaVersion %j", (version) => {
    const input = { ...fullReport(), schemaVersion: version };

    expect(ReportSchema.safeParse(input).success).toBe(false);
  });

  it.each<[string, Change]>([
    ["toolVersion is empty", (r) => ({ ...r, toolVersion: "" })],
    ["toolVersion is missing", (r) => without(r, "toolVersion")],
    [
      "a finding has no baselineState",
      (r) => ({ ...r, findings: [without(nth(r.findings, 0), "baselineState")] }),
    ],
    [
      "a finding has an unknown baselineState",
      (r) => ({ ...r, findings: [{ ...nth(r.findings, 0), baselineState: "fixed" }] }),
    ],
    [
      "a finding is not a valid Finding (§22.3)",
      (r) => ({ ...r, findings: [{ ...nth(r.findings, 0), message: "" }] }),
    ],
    [
      "a count is negative",
      (r) => ({ ...r, summary: { ...r.summary, overall: { total: -1, new: 0 } } }),
    ],
    [
      "a count is not an integer",
      (r) => ({ ...r, summary: { ...r.summary, overall: { total: 1.5, new: 0 } } }),
    ],
    [
      "summary.bySeverity lacks a severity",
      (r) => ({
        ...r,
        summary: { ...r.summary, bySeverity: without(r.summary.bySeverity, "info") },
      }),
    ],
    [
      "a byRule entry has an empty ruleId",
      (r) => ({
        ...r,
        summary: { ...r.summary, byRule: [{ ...nth(r.summary.byRule, 0), ruleId: "" }] },
      }),
    ],
    ["a rule has an empty id", (r) => ({ ...r, rules: [{ ...nth(r.rules, 0), id: "" }] })],
    ["a rule has an empty name", (r) => ({ ...r, rules: [{ ...nth(r.rules, 0), name: "" }] })],
    ["a rule has no name (ADR-0027)", (r) => ({ ...r, rules: [without(nth(r.rules, 0), "name")] })],
    [
      "a rule has an empty shortDescription",
      (r) => ({ ...r, rules: [{ ...nth(r.rules, 0), shortDescription: "" }] }),
    ],
    [
      "a rule has a javascript: docsUrl",
      (r) => ({ ...r, rules: [{ ...nth(r.rules, 0), docsUrl: "javascript:alert(1)" }] }),
    ],
    [
      "a rule has a docsUrl that is not a URL",
      (r) => ({ ...r, rules: [{ ...nth(r.rules, 0), docsUrl: "rules/E2E001" }] }),
    ],
    [
      "a rule has an explicitly undefined docsUrl",
      (r) => ({ ...r, rules: [{ ...nth(r.rules, 0), docsUrl: undefined }] }),
    ],
    [
      "a skipped analyzer has an empty id",
      (r) => ({ ...r, skippedAnalyzers: [{ ...nth(r.skippedAnalyzers, 1), analyzer: "" }] }),
    ],
    [
      "a skipped analyzer has an unknown reason",
      (r) => ({ ...r, skippedAnalyzers: [{ ...nth(r.skippedAnalyzers, 1), reason: "crashed" }] }),
    ],
    [
      "a skipped analyzer missing capabilities does not say which",
      (r) => ({ ...r, skippedAnalyzers: [without(nth(r.skippedAnalyzers, 0), "missing")] }),
    ],
    [
      "a skipped analyzer missing capabilities lists none",
      (r) => ({ ...r, skippedAnalyzers: [{ ...nth(r.skippedAnalyzers, 0), missing: [] }] }),
    ],
    [
      "a skipped analyzer lists an unknown capability",
      (r) => ({
        ...r,
        skippedAnalyzers: [{ ...nth(r.skippedAnalyzers, 0), missing: ["filesystem"] }],
      }),
    ],
  ])("AC-1: rejects a report where %s", (_label, change) => {
    const input = change(fullReport());

    expect(ReportSchema.safeParse(input).success).toBe(false);
  });
});
