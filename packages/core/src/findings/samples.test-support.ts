import type { z } from "zod";
import { ruleDocsUrl } from "./docs-url.js";
import type { FindingSchema } from "./finding.js";

// Valid `Finding` inputs for the findings tests: a minimal one with only the
// required fields and a full one with every optional field set.

type FindingInput = z.input<typeof FindingSchema>;

/** Valid `Finding` input with only the required fields. */
export function minimalFinding(): FindingInput {
  return {
    fingerprint: "0123456789abcdef",
    analyzer: "lint",
    ruleId: "E2E001",
    severity: "warning",
    category: "reliability",
    source: "rule",
    confidence: "high",
    message: "Avoid fixed waits; wait for a condition instead.",
  };
}

/** Valid `Finding` input with every optional field set. */
export function fullFinding(): FindingInput {
  return {
    ...minimalFinding(),
    location: { file: "tests/cart.spec.ts", line: 12, column: 5 },
    testId: "fedcba9876543210",
    evidence: { waitMs: 500, calls: ["page.waitForTimeout"], nested: { ok: true, none: null } },
    suggestion: {
      description: "Wait for the cart badge instead.",
      diff: "-await page.waitForTimeout(500);\n+await expect(badge).toBeVisible();\n",
    },
    docsUrl: ruleDocsUrl("E2E001"),
    owner: "@team-checkout",
  };
}
