import { createRule } from "../create-rule.js";
import type { AtiumCatalogDocs } from "../create-rule.js";

/** Code of the rule that reports a forgotten `.only` (03-linter.md §11.3, E2E010). */
export const RULE_FOCUSED_TEST = "E2E010";

/**
 * `atium/no-focused-test` (E2E010): reports a test or describe left with
 * `.only`, which makes the runner skip the rest of the suite. It offers a
 * suggestion that removes `.only`, not an autofix, because that changes which
 * tests run (03-linter.md §11.3).
 */
export const noFocusedTest = createRule<[], "focused" | "removeOnly", AtiumCatalogDocs>({
  name: "no-focused-test",
  meta: {
    type: "problem",
    docs: {
      description: "Disallow tests and describes left with .only",
      code: RULE_FOCUSED_TEST,
      severity: "error",
      category: "reliability",
      confidence: "high",
      source: "rule",
      recommended: true,
    },
    hasSuggestions: true,
    schema: [],
    messages: {
      focused: "`.only` runs only this {{kind}} and silently skips the rest of the suite.",
      removeOnly: "Remove `.only`.",
    },
  },
  defaultOptions: [],
  create: () => ({}),
});
