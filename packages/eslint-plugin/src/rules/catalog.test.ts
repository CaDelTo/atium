import {
  FINDING_CATEGORIES,
  FINDING_CONFIDENCES,
  FINDING_SEVERITIES,
  FINDING_SOURCES,
  ruleDocsUrl,
} from "@atium/core/pure";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { rules } from "./index.js";

const entries = Object.entries(rules);

describe("rule registry catalog", () => {
  it("registers at least one rule", () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  it.each(entries)("%s carries a valid catalog entry in meta.docs", (name, rule) => {
    const docs = rule.meta.docs;

    expect(docs).toBeDefined();
    expect(docs?.code).toMatch(/^E2E\d{3}$/);
    expect(FINDING_SEVERITIES).toContain(docs?.severity);
    expect(FINDING_CATEGORIES).toContain(docs?.category);
    expect(FINDING_CONFIDENCES).toContain(docs?.confidence);
    expect(FINDING_SOURCES).toContain(docs?.source);
    expect(typeof docs?.recommended).toBe("boolean");
    expect(docs?.url).toBe(ruleDocsUrl(docs?.code ?? ""));
    expect(name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("gives every registered rule a distinct code", () => {
    const codes = entries.map(([, rule]) => rule.meta.docs?.code);

    expect(new Set(codes).size).toBe(codes.length);
  });

  // The table of 03-linter.md §11.8 fixes the values (ADR-0023, section 3);
  // each rule copies its row into meta.docs, and this keeps both in step.
  it.each(entries)("%s matches its row of the catalogue in 03-linter.md §11.8", (name, rule) => {
    const docs = rule.meta.docs;
    const row = catalogueRows().get(docs?.code ?? "");

    expect(row).toEqual({
      eslintName: `atium/${name}`,
      severity: docs?.severity,
      category: docs?.category,
      confidence: docs?.confidence,
      source: docs?.source,
      preset: docs?.recommended === true ? "recommended" : "strict",
    });
  });
});

const DESIGN = join(import.meta.dirname, "../../../../docs/design/03-linter.md");

/** Rows of the per-file rules in the catalogue table, by code. */
function catalogueRows(): ReadonlyMap<string, Record<string, string | undefined>> {
  const rows = new Map<string, Record<string, string | undefined>>();
  for (const line of readFileSync(DESIGN, "utf8").split("\n")) {
    const cells = line.split("|").map((cell) => cell.trim());
    const [, code, eslintName, severity, category, confidence, source, preset] = cells;
    if (code !== undefined && /^E2E\d{3}$/u.test(code) && eslintName?.startsWith("`atium/")) {
      rows.set(code, {
        eslintName: eslintName.slice(1, -1),
        severity,
        category,
        confidence,
        source,
        preset,
      });
    }
  }
  return rows;
}
