import type { TSESTree } from "@typescript-eslint/types";
import { CHAINED_ASSERTIONS, EXPECT_CALLS } from "../defaults.js";
import { calleeName, calleePath, isMethodCall, isOneOf } from "./ast.js";

/**
 * How a call asserts:
 *
 * - `expect`: `expect(...)`, `expect.soft(...)` or `expect.poll(...)`;
 * - `chained`: `.should()` or `.and()`;
 * - `custom`: a function named in `settings.atium.assertFunctionNames`.
 */
export type AssertionKind = "expect" | "chained" | "custom";

/** A call that counts as an assertion, as E2E006 counts them (03-linter.md §11.3). */
export interface Assertion {
  /** The call. */
  readonly node: TSESTree.CallExpression;
  /** How it asserts. */
  readonly kind: AssertionKind;
  /** The name of the called function, such as `expect`, `should` or `verifyCart`. */
  readonly name: string;
}

/** Tells whether a function name counts as an assertion helper. */
export type NameMatcher = (name: string) => boolean;

function patternToRegExp(pattern: string): RegExp {
  const source = pattern
    .split("*")
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${source}$`, "u");
}

/**
 * Builds the matcher of `settings.atium.assertFunctionNames` (03-linter.md
 * §11.1 and §11.3.1). A pattern matches the whole name, with case; `*` matches
 * any sequence, including an empty one, and is the only wildcard.
 *
 * @param patterns - Names or patterns, such as `["expectToast", "verify*"]`.
 * @returns The matcher; with no patterns it matches nothing.
 */
export function createNameMatcher(patterns: readonly string[]): NameMatcher {
  const expressions = patterns.map(patternToRegExp);
  return (name) => expressions.some((expression) => expression.test(name));
}

/**
 * Recognizes a call that counts as an assertion (03-linter.md §11.3, E2E006,
 * and §11.3.1). An `expect(...)` counts once, whatever matchers follow it.
 * Helpers that contain assertions are not followed here: E2E006 resolves those
 * of the same file and E2E006b those of other files.
 *
 * @param call - Any call.
 * @param isAssertFunction - The matcher of `assertFunctionNames`; see
 * {@link createNameMatcher}.
 * @returns The assertion, or `undefined` when the call is not one.
 */
export function assertionOf(
  call: TSESTree.CallExpression,
  isAssertFunction: NameMatcher,
): Assertion | undefined {
  const path = calleePath(call);
  if (path !== undefined && isOneOf(EXPECT_CALLS, path)) {
    return { node: call, kind: "expect", name: path };
  }
  const name = calleeName(call);
  if (name === undefined) {
    return undefined;
  }
  if (isMethodCall(call) && isOneOf(CHAINED_ASSERTIONS, name)) {
    return { node: call, kind: "chained", name };
  }
  return isAssertFunction(name) ? { node: call, kind: "custom", name } : undefined;
}
