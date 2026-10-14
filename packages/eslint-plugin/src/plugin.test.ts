import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";
import { createRule } from "./create-rule.js";
import atium from "./index.js";
import { createPlugin } from "./plugin.js";

const noDebugger = createRule({
  name: "no-debugger-fake",
  meta: {
    type: "problem",
    docs: { description: "Fake rule that reports debugger statements.", code: "E2E999" },
    messages: { found: "Remove the debugger statement." },
    schema: [],
  },
  defaultOptions: [],
  create: (context) => ({
    DebuggerStatement(node) {
      context.report({ node, messageId: "found" });
    },
  }),
});

describe("plugin", () => {
  it("loads in a flat config as plugins: { atium }", async () => {
    const eslint = new ESLint({
      overrideConfigFile: true,
      overrideConfig: [{ plugins: { atium } }],
    });

    const [result] = await eslint.lintText("export const a = 1;\n");

    expect(result?.messages).toEqual([]);
  });

  it("names itself after the package", () => {
    expect(atium.meta.name).toBe("@atium/eslint-plugin");
  });

  it("runs its rules under the atium/ prefix", async () => {
    const eslint = new ESLint({
      overrideConfigFile: true,
      overrideConfig: [
        {
          plugins: { atium: createPlugin({ "no-debugger-fake": noDebugger }) },
          rules: { "atium/no-debugger-fake": "error" },
        },
      ],
    });

    const [result] = await eslint.lintText("debugger;\n");

    expect(result?.messages.map((message) => message.ruleId)).toEqual(["atium/no-debugger-fake"]);
  });
});
