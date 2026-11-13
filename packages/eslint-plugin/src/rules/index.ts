import type { AtiumCatalogRuleModule } from "../create-rule.js";
import { noFocusedTest } from "./no-focused-test.js";
import { noFragileCssSelector } from "./no-fragile-css-selector.js";
import { noHardWait } from "./no-hard-wait.js";

/**
 * Rules of the plugin, by their ESLint name without the `atium/` prefix
 * (03-linter.md §11.8). Each one has a page in `docs/rules/` and carries its
 * catalogue entry in `meta.docs`.
 */
export const rules: Readonly<Record<string, AtiumCatalogRuleModule>> = Object.freeze({
  "no-focused-test": noFocusedTest,
  "no-fragile-css-selector": noFragileCssSelector,
  "no-hard-wait": noHardWait,
});
