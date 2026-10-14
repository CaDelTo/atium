import { AST_NODE_TYPES } from "@typescript-eslint/types";
import type { TSESTree } from "@typescript-eslint/types";
import { CYPRESS_ROOT } from "../defaults.js";

/** A function that can be the callback of a test, describe, hook or step. */
export type FunctionNode = TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression;

/**
 * Whether a node is an arrow function or a function expression.
 *
 * @param node - Any node.
 * @returns `true` for `() => {}` and `function () {}`.
 */
export function isFunctionNode(node: TSESTree.Node): node is FunctionNode {
  return (
    node.type === AST_NODE_TYPES.ArrowFunctionExpression ||
    node.type === AST_NODE_TYPES.FunctionExpression
  );
}

/**
 * Whether a node is a string literal.
 *
 * @param node - Any node.
 * @returns `true` for `"text"` and `'text'`.
 */
export function isStringLiteral(node: TSESTree.Node): node is TSESTree.StringLiteral {
  return node.type === AST_NODE_TYPES.Literal && typeof node.value === "string";
}

/**
 * Name of the property of a member expression: `click` in `page.click` and in
 * `page["click"]`; `undefined` for a private or computed non-literal key.
 */
function propertyName(member: TSESTree.MemberExpression): string | undefined {
  if (!member.computed) {
    return member.property.type === AST_NODE_TYPES.Identifier ? member.property.name : undefined;
  }
  return isStringLiteral(member.property) ? member.property.value : undefined;
}

/**
 * Removes what does not change which value an expression refers to: the
 * TypeScript `x!`, `x as T`, `<T>x` and `x satisfies T`, and the wrapper of
 * an optional chain such as `a?.b`.
 *
 * @param node - Any node.
 * @returns The inner node, or the node itself when it is not wrapped.
 */
export function unwrap(node: TSESTree.Node): TSESTree.Node {
  let current = node;
  while (
    current.type === AST_NODE_TYPES.TSNonNullExpression ||
    current.type === AST_NODE_TYPES.TSAsExpression ||
    current.type === AST_NODE_TYPES.TSTypeAssertion ||
    current.type === AST_NODE_TYPES.TSSatisfiesExpression ||
    current.type === AST_NODE_TYPES.ChainExpression
  ) {
    current = current.expression;
  }
  return current;
}

/**
 * Names of an identifier followed by its properties: `test.describe.only`
 * gives `["test", "describe", "only"]`.
 *
 * @param node - The callee of a call, or any expression.
 * @returns The names, or `undefined` when the expression is not a plain chain of names.
 */
export function memberPath(node: TSESTree.Node): readonly string[] | undefined {
  const target = unwrap(node);
  if (target.type === AST_NODE_TYPES.Identifier) {
    return [target.name];
  }
  if (target.type !== AST_NODE_TYPES.MemberExpression) {
    return undefined;
  }
  const object = memberPath(target.object);
  const property = propertyName(target);
  return object === undefined || property === undefined ? undefined : [...object, property];
}

/**
 * Dotted name of the callee: `test.describe.only` or `expect`.
 *
 * @param call - The call.
 * @returns The name, or `undefined` when the callee is not a plain chain of names.
 */
export function calleePath(call: TSESTree.CallExpression): string | undefined {
  return memberPath(call.callee)?.join(".");
}

/**
 * Name of the called function: `click` in `page.click()`, `verify` in `verify()`.
 *
 * @param call - The call.
 * @returns The name, or `undefined` when the callee has none, such as `fn()()`.
 */
export function calleeName(call: TSESTree.CallExpression): string | undefined {
  const callee = unwrap(call.callee);
  if (callee.type === AST_NODE_TYPES.Identifier) {
    return callee.name;
  }
  return callee.type === AST_NODE_TYPES.MemberExpression ? propertyName(callee) : undefined;
}

/** The calls of a chain and the name it starts with; see {@link chainOf}. */
export interface Chain {
  /** The calls before the given one, nearest first. */
  readonly calls: readonly TSESTree.CallExpression[];
  /** The identifier at the start, or `undefined` when the chain starts with something else. */
  readonly root: string | undefined;
}

/**
 * Walks a chain of calls and properties back to its start: for the `click`
 * call of `cy.get("a").find("b").click()`, the calls are `cy.get("a").find("b")`
 * and `cy.get("a")`, and the root is `cy`. TypeScript wrappers such as `x!`
 * are transparent.
 *
 * @param call - Any call of the chain.
 * @returns The earlier calls and the root; the root is `undefined` when the
 * chain starts with something else, such as `(await x).click()`.
 */
export function chainOf(call: TSESTree.CallExpression): Chain {
  const calls: TSESTree.CallExpression[] = [];
  let node = unwrap(call.callee);
  while (
    node.type === AST_NODE_TYPES.MemberExpression ||
    node.type === AST_NODE_TYPES.CallExpression
  ) {
    if (node.type === AST_NODE_TYPES.CallExpression) {
      calls.push(node);
    }
    node = unwrap(node.type === AST_NODE_TYPES.MemberExpression ? node.object : node.callee);
  }
  return { calls, root: node.type === AST_NODE_TYPES.Identifier ? node.name : undefined };
}

/**
 * Whether a call calls a method, such as `page.click()`, rather than a plain
 * function such as `click()`.
 *
 * @param call - Any call.
 * @returns `true` when the callee is a member expression.
 */
export function isMethodCall(call: TSESTree.CallExpression): boolean {
  return unwrap(call.callee).type === AST_NODE_TYPES.MemberExpression;
}

/**
 * Whether a method call belongs to a chain that starts with `cy`, so it is a
 * Cypress command (03-linter.md §11.3.1).
 *
 * @param call - Any call.
 * @returns `true` for `cy.get("a")` and `cy.get("a").click()`, `false` for `cy()`.
 */
export function isCypressChain(call: TSESTree.CallExpression): boolean {
  return isMethodCall(call) && chainOf(call).root === CYPRESS_ROOT;
}

/**
 * Whether a name is one of a list of literal names, narrowing its type.
 *
 * @param names - The list, such as a list of `defaults.ts`.
 * @param name - The name to look up.
 * @returns `true` when the list contains the name.
 */
export function isOneOf<T extends string>(names: readonly T[], name: string): name is T {
  // Widening the list to `string` is safe: `includes` only compares.
  return (names as readonly string[]).includes(name);
}
