import { RULE_DOCS_BASE_URL } from "../defaults.js";

/**
 * Builds the documentation URL of a rule, used both as `meta.docs.url` in
 * ESLint and as `Finding.docsUrl`. It is the only place that knows where the
 * pages live, so moving them to a docs site only changes this function.
 *
 * @param code - Stable rule code, such as `E2E001` or `E2E006b`.
 * @returns The page URL, such as `https://github.com/CaDelTo/atium/blob/main/docs/rules/e2e001.md`.
 */
export function ruleDocsUrl(code: string): string {
  return `${RULE_DOCS_BASE_URL}${code.toLowerCase()}.md`;
}
