import { createRule } from "../create-rule.js";
import type { AtiumCatalogDocs } from "../create-rule.js";

type MessageId = "preferWebFirst" | "useWebFirst";

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
  create() {
    // Stub for the red phase of #56; the implementation comes next.
    return {};
  },
});
