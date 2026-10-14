import { ruleDocsUrl } from "@atium/core/pure";
import { describe, expect, it } from "vitest";
import { createRuleTester } from "../test/rule-tester.js";
import { createRule } from "./create-rule.js";

const noFoo = createRule({
  name: "no-foo",
  meta: {
    type: "problem",
    docs: { description: "Disallow identifiers named foo.", code: "E2E999" },
    messages: { foo: "Do not name anything foo." },
    schema: [],
  },
  defaultOptions: [],
  create: (context) => ({
    Identifier(node) {
      if (node.name === "foo") {
        context.report({ node, messageId: "foo" });
      }
    },
  }),
});

describe("createRule", () => {
  it("builds meta.docs.url from the rule code", () => {
    expect(noFoo.meta.docs?.url).toBe(ruleDocsUrl("E2E999"));
  });

  it("keeps the rule code in meta.docs", () => {
    expect(noFoo.meta.docs?.code).toBe("E2E999");
  });
});

createRuleTester().run("no-foo", noFoo, {
  valid: ["const bar: number = 1;"],
  invalid: [{ code: "const foo: number = 1;", errors: [{ messageId: "foo" }] }],
});
