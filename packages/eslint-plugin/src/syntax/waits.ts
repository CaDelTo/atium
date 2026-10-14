import { AST_NODE_TYPES } from "@typescript-eslint/types";
import type { TSESTree } from "@typescript-eslint/types";
import { FIXED_WAITS } from "../defaults.js";
import type { FunctionNode } from "./ast.js";
import { calleeName, isCypressChain, isFunctionNode, isMethodCall } from "./ast.js";

/**
 * How a fixed wait is written (03-linter.md §11.3, E2E001):
 *
 * - `waitForTimeout`: `page.waitForTimeout(n)` or `frame.waitForTimeout(n)`;
 * - `cy.wait`: `cy.wait(n)` with a number literal;
 * - `setTimeout`: `new Promise(r => setTimeout(r, n))`.
 */
export type FixedWaitKind = "waitForTimeout" | "cy.wait" | "setTimeout";

/** A call that waits a fixed time instead of waiting for a condition. */
export interface FixedWait {
  /** How the wait is written. */
  readonly kind: FixedWaitKind;
  /** The call, or the `new Promise(...)` expression. */
  readonly node: TSESTree.CallExpression | TSESTree.NewExpression;
  /** The duration argument, when present. */
  readonly duration: TSESTree.CallExpressionArgument | undefined;
}

function isNumberLiteral(node: TSESTree.Node | undefined): boolean {
  return node?.type === AST_NODE_TYPES.Literal && typeof node.value === "number";
}

function waitCallOf(call: TSESTree.CallExpression): FixedWait | undefined {
  if (!isMethodCall(call)) {
    return undefined;
  }
  const name = calleeName(call);
  const [duration] = call.arguments;
  if (name === FIXED_WAITS.playwright) {
    return { kind: "waitForTimeout", node: call, duration };
  }
  return name === FIXED_WAITS.cypress && isCypressChain(call) && isNumberLiteral(duration)
    ? { kind: "cy.wait", node: call, duration }
    : undefined;
}

/** The single call of a function body: `f(x)` in `() => f(x)` and in `() => { f(x); }`. */
function onlyCall(
  body: TSESTree.BlockStatement | TSESTree.Expression,
): TSESTree.CallExpression | undefined {
  if (body.type === AST_NODE_TYPES.CallExpression) {
    return body;
  }
  if (body.type !== AST_NODE_TYPES.BlockStatement || body.body.length !== 1) {
    return undefined;
  }
  const [statement] = body.body;
  return statement?.type === AST_NODE_TYPES.ExpressionStatement &&
    statement.expression.type === AST_NODE_TYPES.CallExpression
    ? statement.expression
    : undefined;
}

/** The executor of `new Promise(executor)`, when it is written inline. */
function promiseExecutor(expression: TSESTree.NewExpression): FunctionNode | undefined {
  const [executor] = expression.arguments;
  return expression.callee.type === AST_NODE_TYPES.Identifier &&
    expression.callee.name === FIXED_WAITS.promise &&
    executor !== undefined &&
    isFunctionNode(executor)
    ? executor
    : undefined;
}

/** The `setTimeout(resolve, n)` that is the whole body of an executor. */
function resolvingTimer(executor: FunctionNode): TSESTree.CallExpression | undefined {
  const [resolve] = executor.params;
  const timer = onlyCall(executor.body);
  const callback = timer?.arguments[0];
  return resolve?.type === AST_NODE_TYPES.Identifier &&
    timer?.callee.type === AST_NODE_TYPES.Identifier &&
    timer.callee.name === FIXED_WAITS.timer &&
    callback?.type === AST_NODE_TYPES.Identifier &&
    callback.name === resolve.name
    ? timer
    : undefined;
}

function promiseWaitOf(expression: TSESTree.NewExpression): FixedWait | undefined {
  const executor = promiseExecutor(expression);
  const timer = executor === undefined ? undefined : resolvingTimer(executor);
  return timer === undefined
    ? undefined
    : { kind: "setTimeout", node: expression, duration: timer.arguments[1] };
}

/**
 * Recognizes a fixed wait (03-linter.md §11.3, E2E001, and §11.3.1). It only
 * classifies the expression: whether it is awaited or inside a test is up to
 * the rule. `cy.wait("@alias")` waits for a request, so it is not a fixed
 * wait; neither is `cy.wait(delay)`, whose type is unknown without type
 * information.
 *
 * @param node - A call, or a `new` expression for the `Promise` form.
 * @returns The wait, or `undefined` when the expression is not a fixed wait.
 */
export function fixedWaitOf(
  node: TSESTree.CallExpression | TSESTree.NewExpression,
): FixedWait | undefined {
  return node.type === AST_NODE_TYPES.CallExpression ? waitCallOf(node) : promiseWaitOf(node);
}
