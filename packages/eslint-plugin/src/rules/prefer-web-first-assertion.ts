import { AST_NODE_TYPES } from "@typescript-eslint/types";
import type { TSESTree } from "@typescript-eslint/types";
import type { TSESLint } from "@typescript-eslint/utils";
import { createRule } from "../create-rule.js";
import type { AtiumCatalogDocs } from "../create-rule.js";
import {
  ELEMENT_HANDLE_QUERY,
  NON_WEB_FIRST_QUERIES,
  WEB_FIRST_EXPECT_CALLS,
  WEB_FIRST_REPLACEMENTS,
} from "../defaults.js";
import type { WebFirstMatcher, WebFirstReplacement } from "../defaults.js";
import {
  calleeName,
  calleePath,
  isMethodCall,
  isOneOf,
  propertyName,
  unwrap,
} from "../syntax/ast.js";
import { locatorOf } from "../syntax/locators.js";

type MessageId = "preferWebFirst" | "useWebFirst";

/** The awaited query inside `expect`: `x.isVisible()` and its receiver `x`. */
interface AwaitedQuery {
  readonly method: (typeof NON_WEB_FIRST_QUERIES)[number];
  readonly call: TSESTree.CallExpression;
  readonly receiver: TSESTree.Expression;
}

/** The matcher called on `expect(…)`, through `.not`. */
interface Matcher {
  readonly call: TSESTree.CallExpression;
  readonly name: string;
  readonly negated: boolean;
}

/** The first argument of `expect` when it is `await x.isVisible()`, `textContent()` or `count()`. */
function awaitedQueryOf(argument: TSESTree.Node | undefined): AwaitedQuery | undefined {
  const awaited = argument === undefined ? undefined : unwrap(argument);
  if (awaited?.type !== AST_NODE_TYPES.AwaitExpression) {
    return undefined;
  }
  const call = unwrap(awaited.argument);
  if (call.type !== AST_NODE_TYPES.CallExpression || !isMethodCall(call)) {
    return undefined;
  }
  const method = calleeName(call);
  const callee = unwrap(call.callee);
  if (method === undefined || !isOneOf(NON_WEB_FIRST_QUERIES, method)) {
    return undefined;
  }
  return callee.type === AST_NODE_TYPES.MemberExpression
    ? { method, call, receiver: callee.object }
    : undefined;
}

/** The member access whose object is `node`, such as `.not` or `.toBe` after `expect(…)`. */
function memberOn(node: TSESTree.Node): TSESTree.MemberExpression | undefined {
  const { parent } = node;
  return parent?.type === AST_NODE_TYPES.MemberExpression && parent.object === node
    ? parent
    : undefined;
}

/** The matcher of `expect(…).matcher(…)` or `expect(…).not.matcher(…)`. */
function matcherOf(expectCall: TSESTree.CallExpression): Matcher | undefined {
  const first = memberOn(expectCall);
  if (first === undefined) {
    return undefined;
  }
  const negated = propertyName(first) === "not";
  const member = negated ? memberOn(first) : first;
  const call = member?.parent;
  if (
    member === undefined ||
    call?.type !== AST_NODE_TYPES.CallExpression ||
    call.callee !== member
  ) {
    return undefined;
  }
  const name = propertyName(member);
  return name === undefined ? undefined : { call, name, negated };
}

/** Whether the matcher's arguments are the ones its row expects (03-linter.md §11.3.1). */
function argumentsFit(
  matcher: Matcher,
  expected: WebFirstMatcher,
  row: WebFirstReplacement,
): boolean {
  const args = matcher.call.arguments;
  if (expected.argument !== undefined) {
    const [only] = args;
    return (
      args.length === 1 && only?.type === AST_NODE_TYPES.Literal && only.value === expected.argument
    );
  }
  const arity = row.keepsArgument ? 1 : 0;
  return args.length === arity && args.every((arg) => arg.type !== AST_NODE_TYPES.SpreadElement);
}

/** The row that replaces this matcher on this query, or `undefined` when none applies. */
function rowOf(query: AwaitedQuery, matcher: Matcher): WebFirstReplacement | undefined {
  return WEB_FIRST_REPLACEMENTS.find((row) => {
    const expected = row.matchers.find(({ name }) => name === matcher.name);
    return (
      row.query === query.method && expected !== undefined && argumentsFit(matcher, expected, row)
    );
  });
}

/**
 * Whether the receiver is a Playwright locator: `locator()` or `getBy*` (not
 * `$()`, an ElementHandle), or `.nth()`, `.first()` or `.last()` on one
 * (03-linter.md §11.3.1, decided in #56).
 */
function isPlaywrightLocator(receiver: TSESTree.Expression): boolean {
  const node = unwrap(receiver);
  const locator = node.type === AST_NODE_TYPES.CallExpression ? locatorOf(node) : undefined;
  const query = locator?.kind === "refinement" ? locator.base : locator;
  return query?.framework === "playwright" && query.method !== ELEMENT_HANDLE_QUERY;
}

/** Whether `await` must be wrapped in parentheses where the matcher call is used. */
function needsParentheses(call: TSESTree.CallExpression): boolean {
  const { parent } = call;
  return (
    (parent.type === AST_NODE_TYPES.MemberExpression && parent.object === call) ||
    (parent.type === AST_NODE_TYPES.CallExpression && parent.callee === call)
  );
}

/** A detected `expect(await x.query()).matcher(…)` that has a replacement row. */
interface Replaceable {
  readonly expectCall: TSESTree.CallExpression;
  readonly query: AwaitedQuery;
  readonly matcher: Matcher;
  readonly row: WebFirstReplacement;
}

/** The web-first assertion that replaces `expect(await x.query()).matcher(…)`. */
function replacementText(
  sourceCode: Readonly<TSESLint.SourceCode>,
  { expectCall, query, matcher, row }: Replaceable,
): string {
  const text = (node: TSESTree.Node) => sourceCode.getText(node);
  const expectArgs = [text(query.receiver), ...expectCall.arguments.slice(1).map(text)].join(", ");
  const argument = row.keepsArgument ? matcher.call.arguments.map(text).join(", ") : "";
  const not = matcher.negated ? ".not" : "";
  const assertion = `${text(expectCall.callee)}(${expectArgs})${not}.${row.replacement}(${argument})`;
  if (matcher.call.parent.type === AST_NODE_TYPES.AwaitExpression) {
    return assertion;
  }
  return needsParentheses(matcher.call) ? `(await ${assertion})` : `await ${assertion}`;
}

/**
 * The replacement for a detected `expect`, or `undefined` when there is only
 * the finding: no matcher row, arguments in the query, or comments that the
 * replacement would drop (03-linter.md §11.3.1).
 */
function replaceableOf(
  sourceCode: Readonly<TSESLint.SourceCode>,
  expectCall: TSESTree.CallExpression,
  query: AwaitedQuery,
): Replaceable | undefined {
  const matcher = matcherOf(expectCall);
  const row = matcher === undefined ? undefined : rowOf(query, matcher);
  if (matcher === undefined || row === undefined || query.call.arguments.length > 0) {
    return undefined;
  }
  return sourceCode.getCommentsInside(matcher.call).length > 0
    ? undefined
    : { expectCall, query, matcher, row };
}

/** Code of the rule that reports assertions that are not web-first (03-linter.md §11.3, E2E009). */
export const RULE_WEB_FIRST_ASSERTION = "E2E009";

/**
 * `atium/prefer-web-first-assertion` (E2E009): reports `expect(await
 * x.isVisible())`, `expect(await x.textContent())` and `expect(await
 * x.count())`, which read the page once instead of waiting, and offers the
 * web-first matcher of 03-linter.md §11.3.1 as an autofix or a suggestion.
 */
export const preferWebFirstAssertion = createRule<[], MessageId, AtiumCatalogDocs>({
  name: "prefer-web-first-assertion",
  meta: {
    type: "problem",
    docs: {
      description: "Require web-first assertions instead of awaiting a value inside expect",
      code: RULE_WEB_FIRST_ASSERTION,
      severity: "warning",
      category: "assertions",
      confidence: "high",
      source: "rule",
      recommended: true,
    },
    fixable: "code",
    hasSuggestions: true,
    schema: [],
    messages: {
      preferWebFirst:
        "`{{query}}()` reads the page once, so the assertion does not wait or retry. Use a web-first assertion on the locator, such as `toBeVisible()`, `toHaveText()` or `toHaveCount()`.",
      useWebFirst: "Use `{{replacement}}`, which waits and retries.",
    },
  },
  defaultOptions: [],
  create(context) {
    const { sourceCode } = context;
    return {
      CallExpression(node) {
        const path = calleePath(node);
        const query =
          path !== undefined && isOneOf(WEB_FIRST_EXPECT_CALLS, path)
            ? awaitedQueryOf(node.arguments[0])
            : undefined;
        if (query === undefined) {
          return;
        }
        const report = {
          node,
          messageId: "preferWebFirst",
          data: { query: query.method },
        } as const;
        const replaceable = replaceableOf(sourceCode, node, query);
        if (replaceable === undefined) {
          context.report(report);
          return;
        }
        const text = replacementText(sourceCode, replaceable);
        const { matcher, row } = replaceable;
        const fix = (fixer: TSESLint.RuleFixer) => fixer.replaceText(matcher.call, text);
        if (row.autofix && isPlaywrightLocator(query.receiver)) {
          context.report({ ...report, fix });
          return;
        }
        const data = { replacement: `${row.replacement}()` };
        context.report({ ...report, suggest: [{ messageId: "useWebFirst", data, fix }] });
      },
    };
  },
});
