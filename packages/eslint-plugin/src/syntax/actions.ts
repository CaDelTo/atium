import type { TSESTree } from "@typescript-eslint/types";
import { CHAINED_ASSERTIONS, PLAYWRIGHT_ACTIONS } from "../defaults.js";
import { calleeName, isCypressChain, isMethodCall, isOneOf } from "./ast.js";
import type { Framework } from "./framework.js";

/** A call that acts on the page, as E2E005 counts them (03-linter.md §11.3). */
export interface Action {
  /** The call. */
  readonly node: TSESTree.CallExpression;
  /** The method or command, such as `click` or `get`. */
  readonly name: string;
  /** The framework whose syntax the call uses. */
  readonly framework: Framework;
}

/**
 * Recognizes an action (03-linter.md §11.3, E2E005, and §11.3.1):
 *
 * - in Playwright, a call to `click`, `fill`, `goto`, `press`, `check` or
 *   `selectOption` on any object;
 * - in Cypress, every command of a chain that starts with `cy`, except the
 *   assertions `.should()` and `.and()`: `cy.get("a").click()` is two actions.
 *
 * It matches names, without type information.
 *
 * @param call - Any call.
 * @returns The action, or `undefined` when the call is not one.
 */
export function actionOf(call: TSESTree.CallExpression): Action | undefined {
  const name = calleeName(call);
  if (name === undefined || !isMethodCall(call)) {
    return undefined;
  }
  if (isCypressChain(call)) {
    return isOneOf(CHAINED_ASSERTIONS, name)
      ? undefined
      : { node: call, name, framework: "cypress" };
  }
  return isOneOf(PLAYWRIGHT_ACTIONS, name)
    ? { node: call, name, framework: "playwright" }
    : undefined;
}
