import { AST_NODE_TYPES } from "@typescript-eslint/types";
import type { TSESTree } from "@typescript-eslint/types";

/** Keys that hold no child node: links back up, positions, and the token lists of the Program. */
const SKIPPED_KEYS: ReadonlySet<string> = new Set(["parent", "loc", "range", "tokens", "comments"]);

function isNode(value: unknown): value is TSESTree.Node {
  return (
    typeof value === "object" && value !== null && "type" in value && typeof value.type === "string"
  );
}

function bySourceOrder(a: TSESTree.Node, b: TSESTree.Node): number {
  // A call and the earlier call of its chain start together: the shorter, earlier one goes first.
  return a.range[0] - b.range[0] || a.range[1] - b.range[1];
}

/**
 * Every call of a file, in source order and, within a chain, in the order the
 * calls run: `cy.get("a")` before the `.click()` that follows it. It walks
 * every key of each node, so it needs no visitor keys and loads no parser.
 *
 * @param program - The AST of the file.
 * @returns The calls.
 */
export function callsOf(program: TSESTree.Program): readonly TSESTree.CallExpression[] {
  const calls: TSESTree.CallExpression[] = [];
  const pending: unknown[] = [...program.body];
  while (pending.length > 0) {
    // Optional keys hold `undefined`, so the end is the length, not the value.
    const value = pending.pop();
    if (Array.isArray(value)) {
      pending.push(...(value as unknown[]));
    } else if (isNode(value)) {
      if (value.type === AST_NODE_TYPES.CallExpression) {
        calls.push(value);
      }
      for (const [key, child] of Object.entries(value)) {
        if (!SKIPPED_KEYS.has(key)) {
          pending.push(child);
        }
      }
    }
  }
  return calls.sort(bySourceOrder);
}
