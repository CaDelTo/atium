import { createRule } from "../create-rule.js";
import type { AtiumCatalogDocs } from "../create-rule.js";
import { TEST_SIZE_DEFAULTS } from "../defaults.js";

/** Code of the rule that reports a test that is too large (03-linter.md §11.3, E2E005). */
export const RULE_TEST_SIZE = "E2E005";

/** Options of `atium/max-test-size`. */
export interface TestSizeOptions {
  /** A test with more actions than this is reported. */
  readonly maxActions: number;
  /** A test whose callback spans more lines than this is reported. */
  readonly maxLines: number;
}

/**
 * `atium/max-test-size` (E2E005): reports a test with more than `maxActions`
 * actions or a callback of more than `maxLines` lines (03-linter.md §11.3 and
 * §11.3.1). Actions inside a `test.step` count for its test; those in hooks
 * and helpers do not.
 */
export const maxTestSize = createRule<[TestSizeOptions], "tooLarge", AtiumCatalogDocs>({
  name: "max-test-size",
  meta: {
    type: "suggestion",
    docs: {
      description: "Limit the number of actions and lines of a test",
      code: RULE_TEST_SIZE,
      severity: "info",
      category: "maintainability",
      confidence: "high",
      source: "rule",
      recommended: false,
    },
    schema: [
      {
        type: "object",
        properties: {
          maxActions: { type: "integer", minimum: 0 },
          maxLines: { type: "integer", minimum: 1 },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      tooLarge:
        "This test has {{actions}} actions and {{lines}} lines, over the limit of {{maxActions}} actions or {{maxLines}} lines. Split it into smaller tests, or move repeated steps into helpers or fixtures.",
    },
  },
  defaultOptions: [TEST_SIZE_DEFAULTS],
  create() {
    throw new Error("not implemented");
  },
});
