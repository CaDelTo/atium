import { AST_NODE_TYPES } from "@typescript-eslint/types";
import type { TSESTree } from "@typescript-eslint/types";
import type { TSESLint } from "@typescript-eslint/utils";
import { createRule } from "../create-rule.js";
import type { AtiumCatalogDocs } from "../create-rule.js";
import { CYPRESS_ROOT } from "../defaults.js";
import { isTransparentWrapper, unwrap } from "../syntax/ast.js";
import { testContextOf } from "../syntax/context.js";
import { fixedWaitOf } from "../syntax/waits.js";
import type { FixedWait } from "../syntax/waits.js";
import { accessStart } from "./member-access.js";

/** Placeholder the user replaces with what to wait for (03-linter.md §11.2; decided in #52). */
const PLACEHOLDER = '"TODO"';

/**
 * Whether an expression is awaited, through `as`, `!`, `satisfies` and `?.`
 * wrappers. The walk stops at the first parent that is not a wrapper, so it
 * never reaches the Program, whose `parent` ESLint sets to `null`.
 */
function isAwaited(node: TSESTree.Node): boolean {
  let current = node;
  while (current.parent !== undefined && isTransparentWrapper(current.parent)) {
    current = current.parent;
  }
  return current.parent?.type === AST_NODE_TYPES.AwaitExpression;
}

/** Receivers that read the same without the parentheses or casts around them. */
function isPlainReceiver(node: TSESTree.Node): boolean {
  return (
    node.type === AST_NODE_TYPES.Identifier ||
    node.type === AST_NODE_TYPES.ThisExpression ||
    node.type === AST_NODE_TYPES.MemberExpression
  );
}

type Fixer = TSESLint.RuleFixer;
type SourceCode = Readonly<TSESLint.SourceCode>;

/**
 * The editable replacement for a fixed wait (decided in #52): a web-first
 * assertion with a placeholder for `waitForTimeout` and `cy.wait(n)`, and
 * `.should("be.visible")` on a Cypress chain that already picks its subject.
 * `undefined` for the promise, whose receiver (`page`, `cy`…) is unknown, and
 * for a `waitForTimeout` whose receiver is not a name, `this` or a member chain.
 */
function replacementOf(
  wait: FixedWait,
  sourceCode: SourceCode,
): ((fixer: Fixer) => TSESLint.RuleFix) | undefined {
  const { node } = wait;
  const callee = node.type === AST_NODE_TYPES.CallExpression ? unwrap(node.callee) : undefined;
  if (callee?.type !== AST_NODE_TYPES.MemberExpression) {
    return undefined;
  }
  // Without its casts and parentheses, so the suggestion stays valid code:
  // `(page as Page).waitForTimeout(n)` becomes `expect(page.getByRole(…))`.
  const receiver = unwrap(callee.object);
  if (wait.kind === "waitForTimeout") {
    if (!isPlainReceiver(receiver)) {
      return undefined;
    }
    const text = `expect(${sourceCode.getText(receiver)}.getByRole(${PLACEHOLDER})).toBeVisible()`;
    return (fixer) => fixer.replaceText(node, text);
  }
  if (receiver.type === AST_NODE_TYPES.Identifier && receiver.name === CYPRESS_ROOT) {
    const text = `${CYPRESS_ROOT}.get(${PLACEHOLDER}).should("be.visible")`;
    return (fixer) => fixer.replaceText(node, text);
  }
  const start = accessStart(sourceCode, callee);
  if (start === undefined) {
    return undefined;
  }
  return (fixer) => fixer.replaceTextRange([start, node.range[1]], '.should("be.visible")');
}

/**
 * Whether the rule reports a fixed wait (decided in #52): `waitForTimeout`
 * and `cy.wait(n)` anywhere, the promise only when awaited inside a test.
 */
function isReported(wait: FixedWait): boolean {
  return (
    wait.kind !== "setTimeout" || (isAwaited(wait.node) && testContextOf(wait.node) !== undefined)
  );
}

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
      waitForCondition: "Replace the fixed wait with a condition to wait for.",
    },
  },
  defaultOptions: [],
  create(context) {
    const report = (node: TSESTree.CallExpression | TSESTree.NewExpression): void => {
      const wait = fixedWaitOf(node);
      if (wait === undefined || !isReported(wait)) {
        return;
      }
      const fix = replacementOf(wait, context.sourceCode);
      context.report({
        node,
        messageId: "hardWait",
        suggest: fix === undefined ? [] : [{ messageId: "waitForCondition", fix }],
      });
    };
    return { CallExpression: report, NewExpression: report };
  },
});
