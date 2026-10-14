import { describe, expect, it } from "vitest";
import { FindingSchema } from "./finding.js";
import { ruleDocsUrl } from "./docs-url.js";
import { minimalFinding } from "./samples.test-support.js";

describe("ruleDocsUrl", () => {
  it("points at the page of the rule code in lowercase", () => {
    expect(ruleDocsUrl("E2E001")).toBe(
      "https://github.com/CaDelTo/atium/blob/main/docs/rules/e2e001.md",
    );
  });

  it("keeps the suffix of a sub-rule code", () => {
    expect(ruleDocsUrl("E2E006b")).toBe(
      "https://github.com/CaDelTo/atium/blob/main/docs/rules/e2e006b.md",
    );
  });

  it("builds a URL that a Finding accepts as docsUrl", () => {
    const parsed = FindingSchema.safeParse({ ...minimalFinding(), docsUrl: ruleDocsUrl("E2E001") });

    expect(parsed.success).toBe(true);
  });
});
