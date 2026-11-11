import { AST_NODE_TYPES } from "@typescript-eslint/types";
import { describe, expect, it } from "vitest";
import { parseSource } from "../../test/parse.js";
import { createRuleTester } from "../../test/rule-tester.js";
import { createRule } from "../create-rule.js";
import type { AtiumCatalogDocs } from "../create-rule.js";
import { enclosingBlocks, testContextOf } from "./context.js";

/**
 * Probe rule: reports each `probe()` call with the kinds of its enclosing
 * blocks and the title of its test. It runs under ESLint, which sets
 * `Program.parent` to `null` (not `undefined`): the case `enclosingBlocks`
 * once looped on.
 */
const probe = createRule<[], "seen", AtiumCatalogDocs>({
  name: "probe",
  meta: {
    type: "problem",
    docs: {
      description: "probe",
      code: "E2E001",
      severity: "warning",
      category: "reliability",
      confidence: "high",
      source: "rule",
      recommended: false,
    },
    schema: [],
    messages: { seen: "{{kinds}}|{{title}}" },
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression(node) {
        if (node.callee.type !== AST_NODE_TYPES.Identifier || node.callee.name !== "probe") {
          return;
        }
        const kinds = enclosingBlocks(node)
          .map((block) => block.kind)
          .join(",");
        const title = testContextOf(node)?.fullTitle ?? "none";
        context.report({ node, messageId: "seen", data: { kinds, title } });
      },
    };
  },
});

const seen = (kinds: string, title: string) => [
  { messageId: "seen" as const, data: { kinds, title } },
];

describe("enclosingBlocks under ESLint (Program.parent is null)", () => {
  createRuleTester().run("probe", probe, {
    valid: [],
    invalid: [
      { code: "probe();", errors: seen("", "none") },
      { code: "const x = [probe()];", errors: seen("", "none") },
      { code: 'test("t", () => { probe(); });', errors: seen("test", "t") },
      {
        code: 'test.describe("d", () => { test("t", async () => { await test.step("s", async () => { probe(); }); }); });',
        errors: seen("describe,test,step", "d › t"),
      },
    ],
  });
});

describe("enclosingBlocks on the Program itself", () => {
  it("returns no blocks for the Program node, which has no parent", () => {
    const { program } = parseSource('test("t", () => {});');

    expect(enclosingBlocks(program)).toEqual([]);
  });
});
