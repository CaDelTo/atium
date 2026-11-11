import { AST_NODE_TYPES } from "@typescript-eslint/types";
import { createRule } from "../create-rule.js";
import type { AtiumCatalogDocs } from "../create-rule.js";
import { unwrap } from "../syntax/ast.js";
import { classifyBlock } from "../syntax/structure.js";
import type { BlockModifier } from "../syntax/structure.js";

/** The modifier that focuses a test or describe (03-linter.md §11.3.1). */
const FOCUS_MODIFIER: BlockModifier = "only";

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
  create(context) {
    return {
      CallExpression(node) {
        const block = classifyBlock(node);
        if (block?.modifiers.includes(FOCUS_MODIFIER) !== true) {
          return;
        }
        // `only` is always the last part of a declaration's name, so it is
        // the property of the callee (03-linter.md §11.3.1).
        const callee = unwrap(node.callee);
        if (callee.type !== AST_NODE_TYPES.MemberExpression) {
          return;
        }
        // From the `.`, `?.` or `[` before `only`, so parentheses around the
        // object and comments before the dot stay: `(test).only` → `(test)`.
        const start = context.sourceCode.getTokenBefore(callee.property);
        if (start === null) {
          return;
        }
        context.report({
          node: callee.property,
          messageId: "focused",
          data: { kind: block.kind === "describe" ? "describe" : "test" },
          suggest: [
            {
              messageId: "removeOnly",
              fix: (fixer) => fixer.removeRange([start.range[0], callee.range[1]]),
            },
          ],
        });
      },
    };
  },
});
