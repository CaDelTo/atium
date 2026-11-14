import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { AtiumError } from "../errors.js";
import { compareStrings } from "../findings/compare.js";
import { reportJsonSchema } from "../model/json-schema.js";
import { ReportSchema } from "../model/report.js";
import type { RuleDescriptor } from "../model/report.js";
import type { SkippedAnalyzer } from "../pipeline/run-analyzers.js";
import { aFinding } from "../testing/finding-builder.js";
import { aReport } from "../testing/report-builder.js";
import { createReport } from "./create-report.js";

function rule(id: string, extra: Partial<RuleDescriptor> = {}): RuleDescriptor {
  return { id, name: `name-${id}`, shortDescription: `title ${id}`, ...extra };
}

describe("createReport edge cases", () => {
  it("counts findings of the same rule under their own severity and once under the rule", () => {
    const report = aReport()
      .withFinding(aFinding().with({ fingerprint: "0000000000000001", severity: "error" }), "new")
      .withFinding(
        aFinding().with({ fingerprint: "0000000000000002", severity: "info" }),
        "unchanged",
      )
      .build();

    expect(report.summary.byRule).toEqual([{ ruleId: "E2E001", total: 2, new: 1 }]);
    expect(report.summary.bySeverity.error).toEqual({ total: 1, new: 1 });
    expect(report.summary.bySeverity.info).toEqual({ total: 1, new: 0 });
    expect(report.summary.bySeverity.warning).toEqual({ total: 0, new: 0 });
  });

  it("sorts missing capabilities in CAPABILITIES order and collapses repeated ones", () => {
    const skipped: SkippedAnalyzer = {
      analyzer: "a",
      reason: { kind: "missing-capabilities", missing: ["git", "history", "git", "dom"] },
    };

    const report = aReport().withSkipped(skipped).build();

    expect(report.skippedAnalyzers).toEqual([
      { analyzer: "a", reason: "missing-capabilities", missing: ["history", "dom", "git"] },
    ]);
  });

  it("rejects missing-capabilities with an empty missing list", () => {
    const skipped: SkippedAnalyzer = {
      analyzer: "a",
      reason: { kind: "missing-capabilities", missing: [] },
    };

    expect(() => aReport().withSkipped(skipped).build()).toThrow();
  });

  it("keeps one entry per reason for the same analyzer, ordered by reason, without error text", () => {
    const report = aReport()
      .withSkipped({
        analyzer: "a",
        reason: { kind: "timeout", error: new AtiumError("E_X", "boom") },
      })
      .withSkipped({ analyzer: "a", reason: { kind: "failed", error: new Error("secret") } })
      .withSkipped({ analyzer: "a", reason: { kind: "aborted", error: undefined } })
      .build();

    expect(report.skippedAnalyzers.map((s) => s.reason)).toEqual(["aborted", "failed", "timeout"]);
    expect(JSON.stringify(report)).not.toContain("secret");
    expect(JSON.stringify(report)).not.toContain("boom");
  });

  it("keeps the docsUrl of a rule and rejects a non-http one", () => {
    const url = "https://example.com/docs/e2e001.md";

    const report = aReport()
      .withRule(rule("E2E001", { docsUrl: url }))
      .build();

    expect(report.rules[0]?.docsUrl).toBe(url);
    expect(() =>
      aReport()
        .withRule(rule("E2E001", { docsUrl: "javascript:alert(1)" }))
        .build(),
    ).toThrow();
  });

  it("does not mutate its input arrays or their order", () => {
    const high = {
      ...aFinding().with({ fingerprint: "00000000000000ff" }).build(),
      baselineState: "new" as const,
    };
    const low = {
      ...aFinding().with({ fingerprint: "0000000000000001" }).build(),
      baselineState: "new" as const,
    };
    const input = {
      toolVersion: "1.0.0",
      findings: [high, low],
      rules: [rule("B"), rule("A")],
      skipped: [
        { analyzer: "z", reason: { kind: "duplicate-id" } },
        { analyzer: "y", reason: { kind: "duplicate-id" } },
      ] satisfies SkippedAnalyzer[],
    };

    createReport(input);

    expect(input.findings.map((f) => f.fingerprint)).toEqual([
      "00000000000000ff",
      "0000000000000001",
    ]);
    expect(input.rules.map((r) => r.id)).toEqual(["B", "A"]);
    expect(input.skipped.map((s) => s.analyzer)).toEqual(["z", "y"]);
  });

  it("orders rule ids by UTF-16 code units, uppercase before lowercase", () => {
    const report = aReport()
      .withRule(rule("b"))
      .withRule(rule("B"))
      .withRule(rule("\u00e9"))
      .build();

    expect(report.rules.map((r) => r.id)).toEqual(["B", "b", "\u00e9"]);
  });

  it("rejects an empty tool version", () => {
    expect(() => aReport().withToolVersion("").build()).toThrow();
  });

  it("survives a JSON round trip through ReportSchema, with Unicode and Windows paths", () => {
    const report = aReport()
      .withFinding(
        aFinding().with({ message: "caf\u00e9 \u{1F600} C:\\tests\\a.spec.ts" }),
        "unchanged",
      )
      .withRule(rule("E2E001", { docsUrl: "https://example.com/x" }))
      .withSkipped({
        analyzer: "n",
        reason: { kind: "missing-capabilities", missing: ["network"] },
      })
      .build();

    const reread = ReportSchema.parse(JSON.parse(JSON.stringify(report)));

    expect(reread).toEqual(report);
  });

  it("is idempotent: rebuilding from a report's own parts gives the same report", () => {
    const report = aReport()
      .withFinding(aFinding().with({ fingerprint: "0000000000000009" }))
      .withFinding(
        aFinding().with({ fingerprint: "0000000000000003", ruleId: "E2E002" }),
        "unchanged",
      )
      .withRule(rule("E2E002"))
      .withRule(rule("E2E001"))
      .build();

    const again = createReport({
      toolVersion: report.toolVersion,
      findings: report.findings,
      rules: report.rules,
      skipped: [],
    });

    expect(again).toEqual(report);
  });
});

describe("published report JSON Schema", () => {
  it("matches the file in schemas/report.v1.json", () => {
    const published: unknown = JSON.parse(
      readFileSync(new URL("../../schemas/report.v1.json", import.meta.url), "utf8"),
    );

    expect(published).toEqual(JSON.parse(JSON.stringify(reportJsonSchema())));
  });

  it("forbids unknown properties and describes exactly the keys of a report", () => {
    const schema = reportJsonSchema();
    const keys = Object.keys(aReport().build()).toSorted(compareStrings);

    expect(schema["additionalProperties"]).toBe(false);
    expect(Object.keys(schema["properties"] as object).toSorted(compareStrings)).toEqual(keys);
    expect([...(schema["required"] as string[])].toSorted(compareStrings)).toEqual(keys);
  });

  it("is rejected by ReportSchema when a report has an unknown field", () => {
    const report = { ...aReport().build(), extra: 1 };

    expect(ReportSchema.safeParse(report).success).toBe(false);
  });
});
