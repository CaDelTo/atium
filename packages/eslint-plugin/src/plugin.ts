import type { Linter, Rule } from "eslint";
import packageJson from "../package.json" with { type: "json" };
import type { AtiumRuleModule } from "./create-rule.js";
import { rules } from "./rules/index.js";

/** The plugin object for an ESLint flat config. */
export interface AtiumPlugin {
  /** Name and version, which ESLint uses in caches and error messages. */
  readonly meta: { readonly name: string; readonly version: string };
  /** Rules, by their ESLint name without the `atium/` prefix. */
  readonly rules: Readonly<Record<string, Rule.RuleModule>>;
  /** Presets, such as `recommended`; none yet. */
  readonly configs: Readonly<Record<string, Linter.Config>>;
}

/**
 * Types a rule built with typescript-eslint as an ESLint rule, so the plugin
 * fits `plugins` in an `eslint.config.ts` typed with ESLint's own types.
 * typescript-eslint's `RuleContext` still declares methods that ESLint 9
 * removed (`getScope`, `getAncestors`…), so TypeScript sees the two types as
 * incompatible; ESLint runs these rules as they are.
 */
function toEslintRule(rule: AtiumRuleModule): Rule.RuleModule {
  return rule as unknown as Rule.RuleModule;
}

/**
 * Builds the plugin object from its rules.
 *
 * @param ruleModules - The rules, by their ESLint name without the `atium/` prefix.
 * @returns The frozen plugin object.
 */
export function createPlugin(ruleModules: Readonly<Record<string, AtiumRuleModule>>): AtiumPlugin {
  return Object.freeze({
    meta: Object.freeze({ name: packageJson.name, version: packageJson.version }),
    rules: Object.freeze(
      Object.fromEntries(
        Object.entries(ruleModules).map(([name, rule]) => [name, toEslintRule(rule)]),
      ),
    ),
    configs: Object.freeze({}),
  });
}

/** The plugin object, registered as `plugins: { atium }` in `eslint.config.js`. */
export const plugin = createPlugin(rules);
