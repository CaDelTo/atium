import { ruleDocsUrl } from "@atium/core/pure";
import { ESLintUtils } from "@typescript-eslint/utils";

/** Fields that every Atium rule adds to `meta.docs`. */
export interface AtiumRuleDocs {
  /**
   * Stable rule code, such as `E2E001`: the `ruleId` of its Findings and the
   * name of its documentation page (ADR-0023, section 2).
   */
  readonly code: string;
}

/** A rule of the plugin, as `createRule` returns it. */
export type AtiumRuleModule = ESLintUtils.RuleModule<string, readonly unknown[], AtiumRuleDocs>;

/**
 * Creates a rule of the plugin with `meta.docs.url` built from its code by
 * `ruleDocsUrl` (ADR-0023, section 4), so no rule writes its own URL.
 *
 * @param rule - The rule: its ESLint `name` (such as `no-hard-wait`), its
 * `meta` with `docs.code`, its `defaultOptions` and `create`.
 * @returns The rule module, ready to register in the plugin's `rules`.
 */
export function createRule<Options extends readonly unknown[], MessageIds extends string>(
  rule: Readonly<ESLintUtils.RuleWithMetaAndName<Options, MessageIds, AtiumRuleDocs>>,
): ESLintUtils.RuleModule<MessageIds, Options, AtiumRuleDocs> {
  return ESLintUtils.RuleCreator<AtiumRuleDocs>(() => ruleDocsUrl(rule.meta.docs.code))(rule);
}
