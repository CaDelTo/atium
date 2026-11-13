import { createRule } from "../create-rule.js";
import type { AtiumCatalogDocs } from "../create-rule.js";
import { POSITIONAL_LOCATOR_DEFAULTS } from "../defaults.js";

type MessageId = "nth" | "firstOrLast";

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
  create() {
    // Stub for the red phase of #55; the implementation comes next.
    return {};
  },
});
