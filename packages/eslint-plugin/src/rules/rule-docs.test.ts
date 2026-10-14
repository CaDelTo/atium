import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { ruleDocsUrl } from "@atium/core/pure";
import { afterEach, describe, expect, it } from "vitest";
import type { AtiumRuleModule } from "../create-rule.js";
import { createRule } from "../create-rule.js";
import { rules } from "./index.js";

const DOCS_DIR = join(import.meta.dirname, "../../../../docs/rules");

/** The sections of a rule page, in order (09-documentation.md, "Reglas"). */
const PAGE_SECTIONS = [
  "## What it detects",
  "## Why it is a problem",
  "## Examples",
  "## Options",
  "## When to disable it",
];

/** Lists what each rule is missing: its page, its sections, its URL or its messages. */
function ruleDocsProblems(
  ruleModules: Readonly<Record<string, AtiumRuleModule>>,
  docsDir: string,
): string[] {
  return Object.entries(ruleModules).flatMap(([name, rule]) => {
    const { docs, messages } = rule.meta;
    const code = docs?.code ?? "";
    // The page file is the one the URL points at, so the two cannot drift apart.
    const page = join(docsDir, basename(new URL(ruleDocsUrl(code)).pathname));
    const problems: string[] = [];
    if (code === "") problems.push(`${name}: no meta.docs.code`);
    if (docs?.url !== ruleDocsUrl(code)) problems.push(`${name}: meta.docs.url is not ruleDocsUrl`);
    if (Object.keys(messages).length === 0) problems.push(`${name}: no meta.messages`);
    if (!existsSync(page)) return [...problems, `${name}: no page ${page}`];
    const content = readFileSync(page, "utf8");
    const missing = PAGE_SECTIONS.filter((section) => !content.includes(`\n${section}\n`));
    return missing.length === 0
      ? problems
      : [...problems, `${name}: missing ${missing.join(", ")}`];
  });
}

function fakeRule(code: string, messages: Record<string, string> = { found: "Found." }) {
  return createRule({
    name: "fake",
    meta: { type: "problem", docs: { description: "Fake rule.", code }, messages, schema: [] },
    defaultOptions: [],
    create: () => ({}),
  });
}

describe("rule documentation", () => {
  it("every rule of the plugin has its page, URL and messages", () => {
    expect(ruleDocsProblems(rules, DOCS_DIR)).toEqual([]);
  });

  it("the template has every section of a rule page", () => {
    const template = readFileSync(join(DOCS_DIR, "_template.md"), "utf8");

    expect(PAGE_SECTIONS.filter((section) => !template.includes(`\n${section}\n`))).toEqual([]);
  });

  describe("the check", () => {
    let dir = "";

    afterEach(() => {
      rmSync(dir, { recursive: true, force: true });
    });

    it("fails for a rule without a page", () => {
      dir = mkdtempSync(join(tmpdir(), "atium-rule-docs-"));

      expect(ruleDocsProblems({ fake: fakeRule("E2E999") }, dir)).toEqual([
        `fake: no page ${join(dir, "e2e999.md")}`,
      ]);
    });

    it("fails for a page without every section", () => {
      dir = mkdtempSync(join(tmpdir(), "atium-rule-docs-"));
      writeFileSync(join(dir, "e2e999.md"), "# E2E999\n\n## What it detects\n\nText.\n");

      expect(ruleDocsProblems({ fake: fakeRule("E2E999") }, dir)).toEqual([
        "fake: missing ## Why it is a problem, ## Examples, ## Options, ## When to disable it",
      ]);
    });

    it("fails for a rule without code or messages", () => {
      dir = mkdtempSync(join(tmpdir(), "atium-rule-docs-"));
      // An empty code points at `.md`: an empty file there gets the check past
      // the missing page, to the missing sections.
      writeFileSync(join(dir, ".md"), "");

      expect(ruleDocsProblems({ fake: fakeRule("", {}) }, dir)).toEqual([
        "fake: no meta.docs.code",
        "fake: no meta.messages",
        `fake: missing ${PAGE_SECTIONS.join(", ")}`,
      ]);
    });

    it("passes for a rule with its page", () => {
      dir = mkdtempSync(join(tmpdir(), "atium-rule-docs-"));
      writeFileSync(join(dir, "e2e999.md"), `# E2E999\n\n${PAGE_SECTIONS.join("\n\nText.\n\n")}\n`);

      expect(ruleDocsProblems({ fake: fakeRule("E2E999") }, dir)).toEqual([]);
    });
  });
});
