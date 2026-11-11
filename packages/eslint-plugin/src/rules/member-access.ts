import type { TSESTree } from "@typescript-eslint/types";
import type { TSESLint } from "@typescript-eslint/utils";

/**
 * Where the access to a member's property starts: the `.`, `?.` or `[` before
 * it. A fix that edits the property from there keeps the parentheses around
 * the object and the comments before the dot: `(test).only` stays `(test)`.
 *
 * @param sourceCode - The source code of the file.
 * @param member - A member expression.
 * @returns The offset of that token, or `undefined` when there is none.
 */
export function accessStart(
  sourceCode: Readonly<TSESLint.SourceCode>,
  member: TSESTree.MemberExpression,
): number | undefined {
  return sourceCode.getTokenBefore(member.property)?.range[0];
}
