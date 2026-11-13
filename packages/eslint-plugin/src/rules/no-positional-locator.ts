import { AST_NODE_TYPES } from "@typescript-eslint/types";
import type { TSESTree } from "@typescript-eslint/types";
import { createRule } from "../create-rule.js";
import type { AtiumCatalogDocs } from "../create-rule.js";
import { INDEXED_REFINEMENTS, POSITIONAL_LOCATOR_DEFAULTS, TEST_ID_LOCATOR } from "../defaults.js";
import { isOneOf, unwrap } from "../syntax/ast.js";
import { locatorOf } from "../syntax/locators.js";
import type { LocatorQuery, LocatorRefinement } from "../syntax/locators.js";

type MessageId = "nth" | "firstOrLast";

/** What to report: the message and its data. */
interface Reason {
  readonly messageId: MessageId;
  readonly data: Readonly<Record<string, string>>;
}

/**
 * The value of a literal integer index, such as `2`, `-1` or `2 as number`
 * (TypeScript wrappers are transparent, §11.3.1); `undefined` for anything else.
 */
function literalIndex(argument: TSESTree.Node | undefined): number | undefined {
  const index = argument === undefined ? undefined : unwrap(argument);
  if (index?.type === AST_NODE_TYPES.Literal && typeof index.value === "number") {
    return Number.isInteger(index.value) ? index.value : undefined;
  }
  if (index?.type === AST_NODE_TYPES.UnaryExpression && index.operator === "-") {
    const positive = literalIndex(index.argument);
    return positive === undefined ? undefined : -positive;
  }
  return undefined;
}

/** A `getByRole` with a name or a `getByTestId`; any other locator may match several elements (D2 of #55). */
function isUnique(base: LocatorQuery): boolean {
  return base.hasName || base.method === TEST_ID_LOCATOR;
}

/** Why a refinement picks by position, or `undefined` when it is not reported (D1 and D2 of #55). */
function reasonOf(refinement: LocatorRefinement, minIndex: number): Reason | undefined {
  const { method, base } = refinement;
  const nonUnique = base !== undefined && !isUnique(base);
  if (!isOneOf(INDEXED_REFINEMENTS, method)) {
    return nonUnique ? { messageId: "firstOrLast", data: { method: `${method}()` } } : undefined;
  }
  const index = literalIndex(refinement.index);
  if (index === undefined) {
    return undefined;
  }
  if (index < 0) {
    // A negative index counts from the end, like `.last()`.
    const data = { method: `${method}(${String(index)})` };
    return nonUnique ? { messageId: "firstOrLast", data } : undefined;
  }
  // Only a getByRole with a name may be refined by index: the "does not detect" case of §11.3.
  return index >= minIndex && base?.hasName !== true
    ? { messageId: "nth", data: { method, index: String(index) } }
    : undefined;
}

/** Code of the rule that reports locators refined by position (03-linter.md §11.3, E2E004). */
export const RULE_POSITIONAL_LOCATOR = "E2E004";

/** Options of `atium/no-positional-locator`. */
export interface PositionalLocatorOptions {
  /** `.nth(n)` and Cypress's `.eq(n)` are reported when the literal `n` is this or more. */
  readonly minIndex: number;
}

/**
 * `atium/no-positional-locator` (E2E004): reports `.nth(n)` (and `.eq(n)` on a
 * `cy` chain) with a literal `n` of `minIndex` or more, unless the locator is a
 * `getByRole` with a name, and `.first()` / `.last()` (or a negative index) on
 * a locator that is not unique (03-linter.md §11.3 and §11.3.1).
 */
export const noPositionalLocator = createRule<
  [PositionalLocatorOptions],
  MessageId,
  AtiumCatalogDocs
>({
  name: "no-positional-locator",
  meta: {
    type: "problem",
    docs: {
      description: "Disallow picking an element of a locator by its position",
      code: RULE_POSITIONAL_LOCATOR,
      severity: "warning",
      category: "selectors",
      confidence: "medium",
      source: "rule",
      recommended: false,
    },
    schema: [
      {
        type: "object",
        properties: { minIndex: { type: "integer", minimum: 0 } },
        additionalProperties: false,
      },
    ],
    messages: {
      nth: "`.{{method}}({{index}})` picks an element by its position, which breaks when the list adds or reorders items. Narrow the locator by role and name, text or test id.",
      firstOrLast:
        "`.{{method}}` picks one element of a locator that matches several, by its position. Narrow the locator by role and name, text or test id until it matches one element.",
    },
  },
  defaultOptions: [POSITIONAL_LOCATOR_DEFAULTS],
  create(context, [{ minIndex }]) {
    return {
      CallExpression(node) {
        const locator = locatorOf(node);
        const callee = unwrap(node.callee);
        if (locator?.kind !== "refinement" || callee.type !== AST_NODE_TYPES.MemberExpression) {
          return;
        }
        const reason = reasonOf(locator, minIndex);
        if (reason !== undefined) {
          context.report({ node: callee.property, ...reason });
        }
      },
    };
  },
});
