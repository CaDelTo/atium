import { Linter } from "eslint";
import { describe, expect, it } from "vitest";
import { createRuleTester } from "../../test/rule-tester.js";
import { createPlugin } from "../plugin.js";
import { preferWebFirstAssertion } from "./prefer-web-first-assertion.js";

type Query = "isVisible" | "textContent" | "count";

/** One expected error: the awaited query and, for a suggestion, its matcher and resulting code. */
interface Expected {
  readonly query: Query;
  readonly suggest?: { readonly replacement: string; readonly output: string };
}

const found = (query: Query): Expected => ({ query });
const suggested = (query: Query, replacement: string, output: string): Expected => ({
  query,
  suggest: { replacement, output },
});

/**
 * An invalid case: the code after the autofix (`null` when there is none) and
 * one entry per expected error, in source order.
 */
function bad(code: string, output: string | string[] | null, ...errors: Expected[]) {
  return {
    code,
    output,
    errors: errors.map(({ query, suggest }) => ({
      messageId: "preferWebFirst" as const,
      data: { query },
      suggestions:
        suggest === undefined
          ? []
          : [
              {
                messageId: "useWebFirst" as const,
                data: { replacement: suggest.replacement },
                output: suggest.output,
              },
            ],
    })),
  };
}

/** A single autofix, whose output is the whole fixed code. */
const fixed = (code: string, query: Query, output: string) => bad(code, output, found(query));
/** Only the finding. */
const onlyFinding = (code: string, query: Query) => bad(code, null, found(query));

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

describe("prefer-web-first-assertion: where await goes", () => {
  createRuleTester().run("prefer-web-first-assertion", preferWebFirstAssertion, {
    valid: [],
    invalid: [
      fixed(
        'a || expect(await page.locator("a").isVisible()).toBe(true);',
        "isVisible",
        'a || await expect(page.locator("a")).toBeVisible();',
      ),
      fixed(
        'async function f() {\n  return expect(await page.locator("a").isVisible()).toBe(true);\n}',
        "isVisible",
        'async function f() {\n  return await expect(page.locator("a")).toBeVisible();\n}',
      ),
      fixed(
        'const f = async () => expect(await page.locator("a").isVisible()).toBe(false);',
        "isVisible",
        'const f = async () => await expect(page.locator("a")).toBeHidden();',
      ),
      fixed(
        'expect(await page.locator("a").isVisible()).toBe(true).then(done);',
        "isVisible",
        '(await expect(page.locator("a")).toBeVisible()).then(done);',
      ),
      fixed(
        'expect(await page.locator("a").isVisible()).toBe(true)(arg);',
        "isVisible",
        '(await expect(page.locator("a")).toBeVisible())(arg);',
      ),
      fixed(
        '!expect(await page.locator("a").isVisible()).toBe(true);',
        "isVisible",
        '!await expect(page.locator("a")).toBeVisible();',
      ),
      fixed(
        'expect(await page.locator("a").isVisible()).toBe(true) ? 1 : 2;',
        "isVisible",
        'await expect(page.locator("a")).toBeVisible() ? 1 : 2;',
      ),
      // The call is already awaited, through parentheses: no second await.
      fixed(
        'await (expect(await page.locator("a").isVisible()).toBe(true));',
        "isVisible",
        'await (expect(page.locator("a")).toBeVisible());',
      ),
      // Inside Promise.all, two expects fixed in the same pass.
      bad(
        'Promise.all([expect(await page.locator("a").isVisible()).toBe(true), expect(await page.locator("b").count()).toBe(2)]);',
        'Promise.all([await expect(page.locator("a")).toBeVisible(), await expect(page.locator("b")).toHaveCount(2)]);',
        found("isVisible"),
        found("count"),
      ),
    ],
  });
});

describe("prefer-web-first-assertion: receivers", () => {
  createRuleTester().run("prefer-web-first-assertion", preferWebFirstAssertion, {
    valid: [],
    invalid: [
      // The receiver text is kept as written, wrappers included.
      fixed(
        'expect(await (page.locator("a") as Locator).isVisible()).toBe(true);',
        "isVisible",
        'await expect(page.locator("a") as Locator).toBeVisible();',
      ),
      fixed(
        'expect(await page.locator("a")!.isVisible()).toBe(true);',
        "isVisible",
        'await expect(page.locator("a")!).toBeVisible();',
      ),
      fixed(
        'expect(await page.getByRole("a")?.isVisible()).toBe(true);',
        "isVisible",
        'await expect(page.getByRole("a")).toBeVisible();',
      ),
      fixed(
        'expect(await page.locator("a").filter({}).first().isVisible()).toBe(true);',
        "isVisible",
        'await expect(page.locator("a").filter({}).first()).toBeVisible();',
      ),
      fixed(
        'expect(await frame.getByRole("x").count()).toBe(1);',
        "count",
        'await expect(frame.getByRole("x")).toHaveCount(1);',
      ),
      // A receiver on several lines keeps its layout.
      fixed(
        'expect(await page\n  .locator("a")\n  .count()).toBe(1);',
        "count",
        'await expect(page\n  .locator("a")).toHaveCount(1);',
      ),
      // Unicode in the receiver and the message survives untouched.
      fixed(
        'expect(await page.getByText("ñandú — 日本語 🚀").count(), "filas 🚀").toBe(2);',
        "count",
        'await expect(page.getByText("ñandú — 日本語 🚀"), "filas 🚀").toHaveCount(2);',
      ),
      // A receiver that is itself awaited is not a recognized locator: suggestion.
      bad(
        "expect(await (await getLoc()).isVisible()).toBe(true);",
        null,
        suggested("isVisible", "toBeVisible()", "await expect(await getLoc()).toBeVisible();"),
      ),
    ],
  });

  createRuleTester().run("prefer-web-first-assertion: not reported", preferWebFirstAssertion, {
    valid: [
      "expect(await page.locator('a').isVisible);",
      "expect(await isVisible()).toBe(true);",
      'expect(void (await page.locator("a").isVisible())).toBe(true);',
      "expect(...args);",
      "expect();",
      'foo.expect(await page.locator("a").isVisible()).toBe(true);',
      'expect.not(await page.locator("a").isVisible()).toBe(true);',
      'expect.configure({})(await page.locator("a").isVisible()).toBe(true);',
      'expect.soft.poll(await page.locator("a").isVisible()).toBe(true);',
    ],
    invalid: [],
  });
});

describe("prefer-web-first-assertion: expect and matcher spellings", () => {
  createRuleTester().run("prefer-web-first-assertion", preferWebFirstAssertion, {
    valid: [],
    invalid: [
      fixed(
        'expect["soft"](await page.locator("a").isVisible()).toBe(true);',
        "isVisible",
        'await expect["soft"](page.locator("a")).toBeVisible();',
      ),
      fixed(
        'expect(await page.locator("a").isVisible())["toBe"](true);',
        "isVisible",
        'await expect(page.locator("a")).toBeVisible();',
      ),
      fixed(
        'expect(await page.locator("a").isVisible())["not"]["toBe"](true);',
        "isVisible",
        'await expect(page.locator("a")).not.toBeVisible();',
      ),
      fixed(
        'expect(await page.locator("a").isVisible()).not.toBeFalsy();',
        "isVisible",
        'await expect(page.locator("a")).not.toBeHidden();',
      ),
      fixed(
        'expect(await page.locator("a").isVisible()).not.toEqual(false);',
        "isVisible",
        'await expect(page.locator("a")).not.toBeHidden();',
      ),
      // Optional call on the matcher: the chain is replaced whole.
      fixed(
        'expect(await page.locator("a").isVisible())?.toBe(true);',
        "isVisible",
        'await expect(page.locator("a")).toBeVisible();',
      ),
      // A second .not, or no call on the matcher: only the finding.
      onlyFinding('expect(await page.locator("a").isVisible()).not.not.toBe(true);', "isVisible"),
      onlyFinding('expect(await page.locator("a").isVisible()).toBe;', "isVisible"),
      onlyFinding('expect(await page.locator("a").isVisible()).not;', "isVisible"),
      onlyFinding('expect(await page.locator("a").isVisible())[matcher](true);', "isVisible"),
      // Matcher arguments.
      fixed(
        'expect(await page.locator("li").count()).toBe(0);',
        "count",
        'await expect(page.locator("li")).toHaveCount(0);',
      ),
      fixed(
        'expect(await page.locator("li").count(), `rows ${n}`).toBe(3);',
        "count",
        'await expect(page.locator("li"), `rows ${n}`).toHaveCount(3);',
      ),
      onlyFinding('expect(await page.locator("li").count()).toBe(...a);', "count"),
      onlyFinding('expect(await page.locator("li").count()).not.toBe(...a);', "count"),
      onlyFinding('expect(await page.locator("a").isVisible()).toBe(...[true]);', "isVisible"),
      onlyFinding('expect(await page.locator("li").count()).toBeTruthy();', "count"),
      onlyFinding('expect(await page.locator("li").count()).toMatch(/1/);', "count"),
      onlyFinding('expect(await page.locator("li").count()).toContain(1);', "count"),
      onlyFinding('expect(await page.locator("a").isVisible()).toMatch(/true/);', "isVisible"),
      onlyFinding('expect(await page.locator("h1").textContent()).toBeTruthy();', "textContent"),
      bad(
        'expect(await page.locator("h1").textContent()).toMatch(/x/i);',
        null,
        suggested(
          "textContent",
          "toHaveText()",
          'await expect(page.locator("h1")).toHaveText(/x/i);',
        ),
      ),
      bad(
        'expect(await page.locator("h1").textContent()).toBe(`a ${b}`);',
        null,
        suggested(
          "textContent",
          "toHaveText()",
          'await expect(page.locator("h1")).toHaveText(`a ${b}`);',
        ),
      ),
    ],
  });

  // The argument must be exactly the boolean literal of the row.
  it.each(["1", '"true"', "null", "undefined", "!0", "0", '"false"', "True"])(
    "reports only the finding for isVisible().toBe(%s)",
    (arg) => {
      const messages = lint(`expect(await page.locator("a").isVisible()).toBe(${arg});`);

      expect(messages).toHaveLength(1);
      expect(messages[0]?.fix).toBeUndefined();
      expect(messages[0]?.suggestions).toBeUndefined();
    },
  );
});

describe("prefer-web-first-assertion: several expects", () => {
  createRuleTester().run("prefer-web-first-assertion", preferWebFirstAssertion, {
    valid: [],
    invalid: [
      // One of each outcome in the same file: only the autofix is applied.
      bad(
        [
          'expect(await page.locator("a").isVisible()).toBe(true);',
          'expect(await page.locator("h1").textContent()).toBe("x");',
          'expect(await page.locator("li").count()).toBeGreaterThan(1);',
        ].join("\n"),
        [
          'await expect(page.locator("a")).toBeVisible();',
          'expect(await page.locator("h1").textContent()).toBe("x");',
          'expect(await page.locator("li").count()).toBeGreaterThan(1);',
        ].join("\n"),
        found("isVisible"),
        suggested(
          "textContent",
          "toHaveText()",
          [
            'expect(await page.locator("a").isVisible()).toBe(true);',
            'await expect(page.locator("h1")).toHaveText("x");',
            'expect(await page.locator("li").count()).toBeGreaterThan(1);',
          ].join("\n"),
        ),
        found("count"),
      ),
      // An expect inside the matcher argument of another: both are reported and
      // the overlapping fix of the inner one lands in a later pass.
      bad(
        'expect(await page.locator("a").count()).toBe(expect(await page.locator("b").isVisible()).toBe(true));',
        [
          'await expect(page.locator("a")).toHaveCount(expect(await page.locator("b").isVisible()).toBe(true));',
          'await expect(page.locator("a")).toHaveCount(await expect(page.locator("b")).toBeVisible());',
        ],
        found("count"),
        found("isVisible"),
      ),
    ],
  });
});

describe("prefer-web-first-assertion: line endings", () => {
  createRuleTester().run("prefer-web-first-assertion", preferWebFirstAssertion, {
    valid: [],
    invalid: [
      fixed(
        'expect(await page.locator("a").isVisible())\r\n  .not\r\n  .toBe(true);',
        "isVisible",
        'await expect(page.locator("a")).not.toBeVisible();',
      ),
    ],
  });
});

describe("prefer-web-first-assertion: messages", () => {
  it.each(["isVisible", "textContent", "count"] as const)(
    "names %s() in the finding, as the design says it reads the page once",
    (query) => {
      const [message] = lint(`expect(await page.locator("a").${query}()).toBeNull();`);

      expect(message?.ruleId).toBe("atium/prefer-web-first-assertion");
      expect(message?.severity).toBe(1);
      expect(message?.message).toBe(
        `\`${query}()\` reads the page once, so the assertion does not wait or retry. Use a web-first assertion on the locator, such as \`toBeVisible()\`, \`toHaveText()\` or \`toHaveCount()\`.`,
      );
      expect(message?.message).not.toContain("{{");
    },
  );

  it.each([
    ["isVisible", "toBe(true)", "toBeVisible()"],
    ["isVisible", "toBe(false)", "toBeHidden()"],
    ["count", "toBe(2)", "toHaveCount()"],
    ["textContent", 'toContain("x")', "toContainText()"],
    ["textContent", 'toBe("x")', "toHaveText()"],
  ] as const)("renders the suggestion for %s().%s as %s", (query, matcher, replacement) => {
    const [message] = lint(`expect(await alert.${query}()).${matcher};`);

    expect(message?.suggestions?.map(({ desc }) => desc)).toEqual([
      `Use \`${replacement}\`, which waits and retries.`,
    ]);
  });

  it("reports the span of the expect call only, on the line it starts", () => {
    const [message] = lint('\n\nexpect(await page.locator("a").isVisible())\n  .toBe(true);');

    expect(message).toMatchObject({ line: 3, column: 1, endLine: 3, endColumn: 44 });
  });
});
