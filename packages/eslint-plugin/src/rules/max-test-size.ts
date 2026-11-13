import type { TSESTree } from "@typescript-eslint/types";
import { createRule } from "../create-rule.js";
import type { AtiumCatalogDocs } from "../create-rule.js";
import { TEST_SIZE_DEFAULTS } from "../defaults.js";
import { actionOf } from "../syntax/actions.js";
import { testContextOf } from "../syntax/context.js";
import { classifyBlock } from "../syntax/structure.js";

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
  create(context, [{ maxActions, maxLines }]) {
    const actions = new Map<TSESTree.CallExpression, number>();
    return {
      CallExpression(node) {
        // The innermost test keeps the action, also inside a `test.step` (§11.3.1).
        const test = actionOf(node) === undefined ? undefined : testContextOf(node)?.test.node;
        if (test !== undefined) {
          actions.set(test, (actions.get(test) ?? 0) + 1);
        }
      },
      // On exit every action of the test has been counted.
      "CallExpression:exit"(node: TSESTree.CallExpression) {
        const block = classifyBlock(node);
        if (block?.kind !== "test") {
          return;
        }
        const { callback } = block;
        const count = actions.get(node) ?? 0;
        const lines = callback.loc.end.line - callback.loc.start.line + 1;
        if (count <= maxActions && lines <= maxLines) {
          return;
        }
        // The callback's header: a node inside the test, so the fingerprint's
        // titlePath includes it (§11.5), without underlining the whole body.
        context.report({
          node: callback,
          loc: { start: callback.loc.start, end: callback.body.loc.start },
          messageId: "tooLarge",
          data: {
            actions: String(count),
            lines: String(lines),
            maxActions: String(maxActions),
            maxLines: String(maxLines),
          },
        });
      },
    };
  },
});
