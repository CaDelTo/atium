import { AST_NODE_TYPES } from "@typescript-eslint/types";
import type { TSESTree } from "@typescript-eslint/types";
import {
  CYPRESS_QUERY,
  GET_BY_PREFIX,
  INDEXED_REFINEMENT,
  LOCATOR_QUERIES,
  LOCATOR_REFINEMENTS,
  ROLE_LOCATOR,
} from "../defaults.js";
import { calleeName, chainOf, isCypressChain, isMethodCall, isOneOf } from "./ast.js";
import type { Framework } from "./framework.js";

/** Playwright's `getBy*` locators: the prefix followed by a capital, such as `getByText`. */
const GET_BY = new RegExp(`^${GET_BY_PREFIX}[A-Z]`, "u");

/**
 * A call that queries elements: `locator()`, `$()`, `getBy*()` or `cy.get()`
 * (03-linter.md §11.3).
 */
export interface LocatorQuery {
  /** Discriminant. */
  readonly kind: "query";
  /** The call. */
  readonly node: TSESTree.CallExpression;
  /** The method, such as `locator`, `getByRole` or `get`. */
  readonly method: string;
  /** The framework whose syntax the call uses. */
  readonly framework: Framework;
  /** The first argument: the selector, role, text or test id. */
  readonly selector: TSESTree.CallExpressionArgument | undefined;
  /** Whether it is a `getByRole` with the `name` option, which E2E004 accepts before `.nth()`. */
  readonly hasName: boolean;
}

/** A call that picks one element of a locator: `.nth()`, `.first()` or `.last()`. */
export interface LocatorRefinement {
  /** Discriminant. */
  readonly kind: "refinement";
  /** The call. */
  readonly node: TSESTree.CallExpression;
  /** The method. */
  readonly method: (typeof LOCATOR_REFINEMENTS)[number];
  /** The argument of `.nth()`; `undefined` for `.first()` and `.last()`. */
  readonly index: TSESTree.CallExpressionArgument | undefined;
  /**
   * The nearest query earlier in the same chain, such as the `getByRole` of
   * `page.getByRole("row").filter(...).nth(1)`; calls and properties between
   * them are skipped. `undefined` when the chain
   * starts from a variable or a call that is not a query.
   */
  readonly base: LocatorQuery | undefined;
}

/** A locator call: a query or a refinement. */
export type LocatorCall = LocatorQuery | LocatorRefinement;

function isNameKey(property: TSESTree.ObjectLiteralElement): boolean {
  if (property.type !== AST_NODE_TYPES.Property || property.computed) {
    return false;
  }
  const { key } = property;
  const name = key.type === AST_NODE_TYPES.Identifier ? key.name : key.value;
  return name === ROLE_LOCATOR.nameOption;
}

function hasNameOption(call: TSESTree.CallExpression): boolean {
  const options = call.arguments[1];
  return options?.type === AST_NODE_TYPES.ObjectExpression && options.properties.some(isNameKey);
}

function frameworkOfQuery(call: TSESTree.CallExpression, method: string): Framework | undefined {
  if (isCypressChain(call)) {
    return method === CYPRESS_QUERY ? "cypress" : undefined;
  }
  return isOneOf(LOCATOR_QUERIES, method) || GET_BY.test(method) ? "playwright" : undefined;
}

function queryOf(call: TSESTree.CallExpression): LocatorQuery | undefined {
  const method = isMethodCall(call) ? calleeName(call) : undefined;
  const framework = method === undefined ? undefined : frameworkOfQuery(call, method);
  if (method === undefined || framework === undefined) {
    return undefined;
  }
  return {
    kind: "query",
    node: call,
    method,
    framework,
    selector: call.arguments[0],
    hasName: method === ROLE_LOCATOR.method && hasNameOption(call),
  };
}

function baseQuery(call: TSESTree.CallExpression): LocatorQuery | undefined {
  for (const earlier of chainOf(call).calls) {
    const query = queryOf(earlier);
    if (query !== undefined) {
      return query;
    }
  }
  return undefined;
}

/**
 * Recognizes a locator call (03-linter.md §11.3 and §11.3.1): a query, on any
 * object for Playwright and on a `cy` chain for Cypress, or a refinement.
 * It matches names, without type information.
 *
 * @param call - Any call.
 * @returns The locator call, or `undefined` when the call is not one.
 */
export function locatorOf(call: TSESTree.CallExpression): LocatorCall | undefined {
  const method = calleeName(call);
  if (method !== undefined && isMethodCall(call) && isOneOf(LOCATOR_REFINEMENTS, method)) {
    return {
      kind: "refinement",
      node: call,
      method,
      index: method === INDEXED_REFINEMENT ? call.arguments[0] : undefined,
      base: baseQuery(call),
    };
  }
  return queryOf(call);
}
