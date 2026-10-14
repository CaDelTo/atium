import type { AtiumRuleModule } from "../create-rule.js";

/**
 * Rules of the plugin, by their ESLint name without the `atium/` prefix
 * (03-linter.md §11.8). Each one has a page in `docs/rules/`.
 */
export const rules: Readonly<Record<string, AtiumRuleModule>> = Object.freeze({});
