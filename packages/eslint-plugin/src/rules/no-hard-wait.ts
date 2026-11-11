import { createRule } from "../create-rule.js";
import type { AtiumCatalogDocs } from "../create-rule.js";

/** Code of the rule that reports fixed waits (03-linter.md §11.3, E2E001). */
export const RULE_HARD_WAIT = "E2E001";

/**
 * `atium/no-hard-wait` (E2E001): reports fixed waits — `waitForTimeout(n)`,
 * `cy.wait(<number>)` and an awaited `new Promise(r => setTimeout(r, n))`
 * inside a test (03-linter.md §11.3 and §11.3.1). It has no autofix, because
 * what to wait for cannot be known; it offers an editable suggestion with a
 * placeholder to fill in (§11.2), except for the promise, whose receiver is
 * unknown.
 */
export const noHardWait = createRule<[], "hardWait" | "waitForCondition", AtiumCatalogDocs>({
  name: "no-hard-wait",
  meta: {
    type: "problem",
    docs: {
      description: "Disallow fixed waits; wait for a condition instead",
      code: RULE_HARD_WAIT,
      severity: "warning",
      category: "reliability",
      confidence: "high",
      source: "rule",
      recommended: true,
    },
    hasSuggestions: true,
    schema: [],
    messages: {
      hardWait:
        "Fixed waits slow down the suite and cause flakiness when the app is slower than expected. Wait for a condition instead.",
      waitForCondition: "Wait for a condition instead, and fill in the TODO.",
    },
  },
  defaultOptions: [],
  create: () => ({}),
});
