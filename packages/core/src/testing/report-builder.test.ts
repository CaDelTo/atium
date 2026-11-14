import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { ReportSchema } from "../model/report.js";
import { aFinding } from "./finding-builder.js";
import type { RuleDescriptor } from "../model/report.js";
import type { SkippedAnalyzer } from "../pipeline/run-analyzers.js";
import { aReport, TEST_TOOL_VERSION } from "./report-builder.js";

const rule: RuleDescriptor = {
  id: "E2E001",
  name: "no-hard-wait",
  shortDescription: "Hard wait detected",
};
const skipped: SkippedAnalyzer = { analyzer: "flaky", reason: { kind: "duplicate-id" } };

describe("aReport", () => {
  it("builds a valid, frozen empty report by default", () => {
    const report = aReport().build();

    expect(ReportSchema.safeParse(report).success).toBe(true);
    expect(report.toolVersion).toBe(TEST_TOOL_VERSION);
    expect(report.findings).toEqual([]);
    expect(report.rules).toEqual([]);
    expect(report.skippedAnalyzers).toEqual([]);
    expect(report.summary.overall).toEqual({ total: 0, new: 0 });
    expect(Object.isFrozen(report)).toBe(true);
  });

  it("builds the same report every time", () => {
    const build = (): unknown =>
      aReport().withFinding(aFinding()).withRule(rule).withSkipped(skipped).build();

    expect(build()).toStrictEqual(build());
  });

  it("adds a finding as new unless a baseline state is given", () => {
    const report = aReport()
      .withFinding(aFinding().with({ location: { file: "a.spec.ts" } }))
      .withFinding(aFinding().with({ fingerprint: "00000000000000ff" }), "unchanged")
      .build();

    expect(report.findings.map((finding) => finding.baselineState)).toEqual(["new", "unchanged"]);
  });

  it("accepts a built finding as well as a builder", () => {
    const fromBuilder = aReport().withFinding(aFinding()).build();
    const fromFinding = aReport().withFinding(aFinding().build()).build();

    expect(fromFinding).toStrictEqual(fromBuilder);
  });

  it("sorts and summarizes through createReport", () => {
    const report = aReport()
      .withFinding(aFinding().with({ fingerprint: "00000000000000ff", ruleId: "E2E002" }))
      .withFinding(aFinding(), "unchanged")
      .build();

    expect(report.findings.map((finding) => finding.ruleId)).toEqual(["E2E001", "E2E002"]);
    expect(report.summary.overall).toEqual({ total: 2, new: 1 });
  });

  it("adds rules and skipped analyzers, and sets the tool version", () => {
    const report = aReport().withRule(rule).withSkipped(skipped).withToolVersion("1.4.0").build();

    expect(report.rules).toEqual([rule]);
    expect(report.skippedAnalyzers).toEqual([{ analyzer: "flaky", reason: "duplicate-id" }]);
    expect(report.toolVersion).toBe("1.4.0");
  });

  it("does not change the builder it was called on", () => {
    const original = aReport();
    const before = original.build();

    original.withFinding(aFinding());
    original.withRule(rule);
    original.withSkipped(skipped);
    original.withToolVersion("1.4.0");

    expect(original.build()).toStrictEqual(before);
  });

  it("throws the ZodError of createReport when the report is invalid", () => {
    expect(() => aReport().withToolVersion("").build()).toThrow(ZodError);
  });
});
