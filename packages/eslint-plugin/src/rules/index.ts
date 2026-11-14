import type { AtiumCatalogRuleModule } from "../create-rule.js";
import { maxTestSize } from "./max-test-size.js";
import { noFocusedTest } from "./no-focused-test.js";
import { noFragileCssSelector } from "./no-fragile-css-selector.js";
import { noHardWait } from "./no-hard-wait.js";
import { noPositionalLocator } from "./no-positional-locator.js";
import { noPositionalXPath } from "./no-positional-xpath.js";
import { preferWebFirstAssertion } from "./prefer-web-first-assertion.js";

/**
 * Rules of the plugin, by their ESLint name without the `atium/` prefix
 * (03-linter.md §11.8). Each one has a page in `docs/rules/` and carries its
 * catalogue entry in `meta.docs`.
 */
export const rules: Readonly<Record<string, AtiumCatalogRuleModule>> = Object.freeze({
  "max-test-size": maxTestSize,
  "no-focused-test": noFocusedTest,
  "no-fragile-css-selector": noFragileCssSelector,
  "no-hard-wait": noHardWait,
  "no-positional-locator": noPositionalLocator,
  "no-positional-xpath": noPositionalXPath,
  "prefer-web-first-assertion": preferWebFirstAssertion,
});
