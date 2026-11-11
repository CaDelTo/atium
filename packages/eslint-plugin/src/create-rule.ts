import { ruleDocsUrl } from "@atium/core/pure";
import type {
  FindingCategory,
  FindingConfidence,
  FindingSeverity,
  FindingSource,
} from "@atium/core/pure";
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
 * The entry of a per-file rule in the rule catalogue (03-linter.md §11.8,
 * ADR-0023, section 3): the fields of its Findings and whether `recommended`
 * includes it. It lives in the rule's `meta.docs`, so each rule carries its
 * own entry and no separate table can drift from it.
 */
export interface AtiumCatalogDocs extends AtiumRuleDocs {
  /** Severity of its Findings, whatever level the user gives the rule in ESLint. */
  readonly severity: FindingSeverity;
  /** Category of its Findings. */
  readonly category: FindingCategory;
  /** How sure the rule is about each Finding. */
  readonly confidence: FindingConfidence;
  /** What produces its Findings: `rule` for a deterministic rule. */
  readonly source: FindingSource;
  /** Whether the `recommended` preset includes it. */
  readonly recommended: boolean;
}

/** A registered rule of the plugin, with its catalogue entry in `meta.docs`. */
export type AtiumCatalogRuleModule = ESLintUtils.RuleModule<
  string,
  readonly unknown[],
  AtiumCatalogDocs
>;

/**
 * Creates a rule of the plugin with `meta.docs.url` built from its code by
 * `ruleDocsUrl` (ADR-0023, section 4), so no rule writes its own URL.
 *
 * A registered rule passes `AtiumCatalogDocs` as `Docs`, so the compiler checks
 * its catalogue entry: `createRule<[], "message", AtiumCatalogDocs>({ ... })`.
 *
 * @param rule - The rule: its ESLint `name` (such as `no-hard-wait`), its
 * `meta` with `docs.code`, its `defaultOptions` and `create`.
 * @returns The rule module, ready to register in the plugin's `rules`.
 */
export function createRule<
  Options extends readonly unknown[],
  MessageIds extends string,
  Docs extends AtiumRuleDocs = AtiumRuleDocs,
>(
  rule: Readonly<ESLintUtils.RuleWithMetaAndName<Options, MessageIds, Docs>>,
): ESLintUtils.RuleModule<MessageIds, Options, Docs> {
  return ESLintUtils.RuleCreator<Docs>(() => ruleDocsUrl(rule.meta.docs.code))(rule);
}
