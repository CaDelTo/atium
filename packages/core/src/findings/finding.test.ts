import { describe, expect, it } from "vitest";
import { without } from "../model/samples.test-support.js";
import {
  FINDING_CATEGORIES,
  FINDING_CONFIDENCES,
  FINDING_SEVERITIES,
  FINDING_SOURCES,
  FindingFingerprintSchema,
  FindingSchema,
} from "./finding.js";
import { fullFinding, minimalFinding } from "./samples.test-support.js";

describe("FindingSchema", () => {
  it.each([
    ["only the required fields", minimalFinding()],
    ["every optional field", fullFinding()],
    ["a location with only a file", { ...minimalFinding(), location: { file: "a.spec.ts" } }],
    ["a suggestion without a diff", { ...minimalFinding(), suggestion: { description: "Fix" } }],
    ["an http docsUrl", { ...minimalFinding(), docsUrl: "http://localhost:3000/rules/E2E001" }],
  ])("accepts a finding with %s", (_label, input) => {
    expect(FindingSchema.safeParse(input).success).toBe(true);
  });

  it.each([
    ["severity", FINDING_SEVERITIES],
    ["category", FINDING_CATEGORIES],
    ["source", FINDING_SOURCES],
    ["confidence", FINDING_CONFIDENCES],
  ] as const)("accepts every %s of 14-architecture.md §22.3", (field, values) => {
    for (const value of values) {
      expect(FindingSchema.safeParse({ ...minimalFinding(), [field]: value }).success).toBe(true);
    }
  });

  it.each([
    ["source is missing (ADR-0004)", without(minimalFinding(), "source")],
    ["confidence is missing (ADR-0004)", without(minimalFinding(), "confidence")],
    ["fingerprint is missing", without(minimalFinding(), "fingerprint")],
    ["severity is not a known severity", { ...minimalFinding(), severity: "critical" }],
    ["category is not a known category", { ...minimalFinding(), category: "style" }],
    ["ruleId is empty", { ...minimalFinding(), ruleId: "" }],
    ["message is empty", { ...minimalFinding(), message: "" }],
    [
      "fingerprint is not 16 lowercase hex",
      { ...minimalFinding(), fingerprint: "0123456789ABCDEF" },
    ],
    ["line is 0", { ...minimalFinding(), location: { file: "a.spec.ts", line: 0 } }],
    [
      "column is not an integer",
      { ...minimalFinding(), location: { file: "a.spec.ts", column: 1.5 } },
    ],
    ["location has no file", { ...minimalFinding(), location: { line: 1 } }],
    ["testId is not 16 hex", { ...minimalFinding(), testId: "login" }],
    ["evidence holds a non-JSON value", { ...minimalFinding(), evidence: { at: new Date(0) } }],
    ["docsUrl is a javascript: URL", { ...minimalFinding(), docsUrl: "javascript:alert(1)" }],
    ["docsUrl is not a URL", { ...minimalFinding(), docsUrl: "rules/E2E001" }],
    [
      "suggestion.diff is empty",
      { ...minimalFinding(), suggestion: { description: "Fix", diff: "" } },
    ],
    ["it has an unknown field", { ...minimalFinding(), score: 3 }],
    ["an optional field is explicitly undefined", { ...minimalFinding(), testId: undefined }],
  ])("rejects a finding where %s", (_label, input) => {
    expect(FindingSchema.safeParse(input).success).toBe(false);
  });

  it("returns a frozen finding", () => {
    const finding = FindingSchema.parse(fullFinding());

    expect(Object.isFrozen(finding)).toBe(true);
    expect(Object.isFrozen(finding.location)).toBe(true);
  });
});

describe("FindingFingerprintSchema", () => {
  it("accepts 16 lowercase hex characters only", () => {
    expect(FindingFingerprintSchema.safeParse("0123456789abcdef").success).toBe(true);
    expect(FindingFingerprintSchema.safeParse("0123456789abcde").success).toBe(false);
    expect(FindingFingerprintSchema.safeParse("0123456789abcdefa").success).toBe(false);
  });
});
