import {
  FINDING_CATEGORIES,
  FINDING_CONFIDENCES,
  FINDING_SEVERITIES,
  FINDING_SOURCES,
  ruleDocsUrl,
} from "@atium/core/pure";
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
});
