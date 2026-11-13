import { Linter } from "eslint";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { createPlugin } from "../plugin.js";
import { preferWebFirstAssertion } from "./prefer-web-first-assertion.js";

const config: Linter.Config[] = [
  {
    files: ["**/*.js"],
    languageOptions: { ecmaVersion: "latest", sourceType: "module" },
    plugins: {
      atium: createPlugin({ "prefer-web-first-assertion": preferWebFirstAssertion }),
    },
    rules: { "atium/prefer-web-first-assertion": "warn" },
  },
];

const linter = new Linter({ configType: "flat", cwd: process.cwd() });
const lint = (code: string) => linter.verify(code, config, "a.js");
const autofixed = (code: string) => linter.verifyAndFix(code, config, "a.js");

describe("prefer-web-first-assertion: properties", () => {
  const receivers = [
    'page.locator("a")',
    'page.getByRole("b")',
    'page.getByText("c").first()',
    'page.locator("d").nth(2)',
    'frame.locator("e")',
    'page.$("f")',
    "alert",
    "items.first()",
  ];
  const matchers = [
    ".toBe(true)",
    ".toBe(false)",
    ".toEqual(true)",
    ".toBeTruthy()",
    ".toBeFalsy()",
    ".not.toBeFalsy()",
    ".not.toBe(true)",
    ".toBe(3)",
    '.toBe("x")',
    '.toContain("x")',
    ".toMatch(/x/)",
    ".toBeNull()",
    ".toBe()",
    ".toBe(...a)",
    "",
  ];
  const statements = [
    (e: string) => `${e};`,
    (e: string) => `await ${e};`,
    (e: string) => `return ${e};`,
    (e: string) => `a || ${e};`,
    (e: string) => `x = ${e};`,
    (e: string) => `[${e}];`,
    (e: string) => `void ${e};`,
  ];
  const suite = fc.record({
    receiver: fc.constantFrom(...receivers),
    query: fc.constantFrom("isVisible", "textContent", "count"),
    matcher: fc.constantFrom(...matchers),
    message: fc.constantFrom("", ', "msg"'),
    soft: fc.boolean(),
    statement: fc.constantFrom(...statements),
  });
  const build = (c: {
    receiver: string;
    query: string;
    matcher: string;
    message: string;
    soft: boolean;
    statement: (expression: string) => string;
  }) => {
    const head = c.soft ? "expect.soft" : "expect";
    const call = `${head}(await ${c.receiver}.${c.query}()${c.message})${c.matcher}`;
    return `async function f() { ${c.statement(call)} }`;
  };

  it("fixes into valid code, once, and keeps the finding of what it cannot fix", () => {
    fc.assert(
      fc.property(suite, (c) => {
        const code = build(c);
        const first = autofixed(code);
        const again = autofixed(first.output);

        // Every message left is a finding without autofix, never a parse error.
        expect(first.messages.every((m) => m.fatal !== true)).toBe(true);
        expect(first.messages.every((m) => m.ruleId === "atium/prefer-web-first-assertion")).toBe(
          true,
        );
        expect(again.output).toBe(first.output);
        expect(again.messages).toHaveLength(first.messages.length);
        // No expect call is lost or duplicated.
        expect(first.output.match(/expect/g)?.length).toBe(code.match(/expect/g)?.length);
      }),
      { seed: 56, numRuns: 400 },
    );
  });

  it("reports exactly one finding per awaited query, whatever the matcher", () => {
    fc.assert(
      fc.property(suite, (c) => {
        const messages = lint(build(c));

        expect(messages).toHaveLength(1);
        expect(messages[0]?.message).toContain(`\`${c.query}()\``);
      }),
      { seed: 56, numRuns: 200 },
    );
  });
});

describe("prefer-web-first-assertion: regressions found by test-writer", () => {
  // `(a, b)` is one expression; as `expect(a, b)` it would become the receiver `a` plus a message `b`.
  it("keeps a parenthesized sequence receiver as one argument", () => {
    const [message] = lint("expect(await (a, b).isVisible()).toBe(true);");

    expect(message?.suggestions?.[0]?.fix.text).toBe("await expect((a, b)).toBeVisible()");
  });

  // The matcher call is already awaited through `?.`, so no second await is added.
  it("does not add a second await when the matcher call is awaited through an optional chain", () => {
    const { output } = autofixed('await expect(await page.locator("a").isVisible())?.toBe(true);');

    expect(output).toBe('await expect(page.locator("a")).toBeVisible();');
  });
});
