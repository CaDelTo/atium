import { HEAVY_TEST_TIMEOUT_MS } from "@atium/core/testing";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { parseSource } from "../../test/parse.js";
import { calleeName } from "./ast.js";
import { enclosingBlocks, testContextOf, titlePathOf } from "./context.js";
import { classifyBlock } from "./structure.js";

// Fixed seed, so a failure reproduces (04-testing.md, "Determinismo").
const runOptions = { seed: 20261013, numRuns: 300 };

const playwrightSpec = `
import { test, expect } from "@playwright/test";

const baseUrl = "https://shop.test";

test.beforeEach(async ({ page }) => {
  await page.goto(baseUrl);
});

test.describe("cart", () => {
  test.describe(() => {
    test("adds an item", async ({ page }) => {
      await test.step("open the product", async () => {
        await page.click("#product");
      });
      await expect(page.getByRole("button", { name: "Add" })).toBeVisible();
    });
  });

  test.describe(\`for \${user.name}\`, () => {
    test("removes an item", async ({ page }) => {
      await page.fill("#qty", "0");
    });
  });
});
`;

const cypressSpec = `
describe("login", () => {
  context("with a valid user", () => {
    beforeEach(() => {
      cy.visit("/login");
    });

    it("signs in", () => {
      cy.get("[data-cy=submit]").click();
    });
  });
});
`;

describe("testContextOf", () => {
  const playwright = parseSource(playwrightSpec);

  it("returns the test and its titlePath through nested describes", () => {
    const context = testContextOf(playwright.call('page.fill("#qty", "0")'));

    expect(context).toMatchObject({
      titles: ["cart", "for ${user.name}", "removes an item"],
      fullTitle: "cart › for ${user.name} › removes an item",
      isStatic: false,
    });
    expect(context?.test.kind).toBe("test");
  });

  it("skips a describe without title and attributes a step to its test", () => {
    const context = testContextOf(playwright.call('page.click("#product")'));

    expect(context).toMatchObject({
      titles: ["cart", "adds an item"],
      fullTitle: "cart › adds an item",
      isStatic: true,
    });
  });

  it("returns undefined for a node in a hook", () => {
    expect(testContextOf(playwright.call("page.goto(baseUrl)"))).toBeUndefined();
  });

  it("returns undefined for a node at module level", () => {
    expect(testContextOf(playwright.node('"https://shop.test"'))).toBeUndefined();
  });

  it("does not place the title of a test inside that test", () => {
    expect(testContextOf(playwright.node('"adds an item"'))).toBeUndefined();
  });

  it("reads Mocha and Cypress tests with context blocks", () => {
    const cypress = parseSource(cypressSpec);

    expect(testContextOf(cypress.call('cy.get("[data-cy=submit]")'))?.titles).toEqual([
      "login",
      "with a valid user",
      "signs in",
    ]);
  });
});

describe("enclosingBlocks", () => {
  it("lists the blocks that contain a node, outermost first", () => {
    const parsed = parseSource(playwrightSpec);
    const blocks = enclosingBlocks(parsed.call('page.click("#product")'));

    expect(blocks.map((block) => block.kind)).toEqual(["describe", "describe", "test", "step"]);
  });

  it("includes the hook that contains a node", () => {
    const parsed = parseSource(cypressSpec);

    expect(enclosingBlocks(parsed.call('cy.visit("/login")')).map((block) => block.name)).toEqual([
      "describe",
      "context",
      "beforeEach",
    ]);
  });

  it("ignores a function passed to a call that declares nothing", () => {
    const parsed = parseSource('test("pays", () => { items.forEach(() => { pay(); }); });');

    expect(enclosingBlocks(parsed.call("pay()")).map((block) => block.name)).toEqual(["test"]);
  });

  it("ignores a function in another argument of a declaration", () => {
    const parsed = parseSource('test("pays", { fn: () => { pay(); } }, () => {});');

    expect(enclosingBlocks(parsed.call("pay()"))).toEqual([]);
  });
});

describe("titlePathOf", () => {
  it("gives the titlePath of a describe", () => {
    const parsed = parseSource(cypressSpec);
    const context = classifyBlock(parsed.calls.find((call) => calleeName(call) === "context")!);

    expect(titlePathOf(context!)).toEqual({
      titles: ["login", "with a valid user"],
      fullTitle: "login › with a valid user",
      isStatic: true,
    });
  });

  it("gives the path of its test for a step", () => {
    const parsed = parseSource(playwrightSpec);
    const step = classifyBlock(parsed.calls.find((call) => calleeName(call) === "step")!);

    expect(titlePathOf(step!).titles).toEqual(["cart", "adds an item"]);
  });

  it("drops a Playwright describe titled with an empty string, as Playwright does", () => {
    const parsed = parseSource('test.describe("", () => { test("pays", () => { pay(); }); });');

    expect(testContextOf(parsed.call("pay()"))?.titles).toEqual(["pays"]);
  });

  it("keeps a Mocha describe titled with an empty string, as Mocha does", () => {
    const parsed = parseSource('describe("", () => { it("pays", () => { pay(); }); });');

    expect(testContextOf(parsed.call("pay()"))?.titles).toEqual(["", "pays"]);
  });

  it("keeps a test titled with an empty string", () => {
    const parsed = parseSource('test.describe("cart", () => { test("", () => { pay(); }); });');

    expect(testContextOf(parsed.call("pay()"))?.titles).toEqual(["cart", ""]);
  });

  it("gives the path of the describes for a hook", () => {
    const parsed = parseSource(cypressSpec);
    const hook = classifyBlock(parsed.calls.find((call) => calleeName(call) === "beforeEach")!);

    expect(titlePathOf(hook!).titles).toEqual(["login", "with a valid user"]);
  });

  // 300 typescript-estree parses: slow next to the rest of the suite, so room on
  // a loaded CI runner (#99).
  it(
    "is stable when spaces and line breaks change between tokens",
    () => {
      // Every token of a spec; whitespace is free between any two of them, except
      // that a line break before `=>` is a syntax error.
      // prettier-ignore
      const tokens = [
      "test", ".", "describe", "(", "DESCRIBE", ",", "(", ")", "=>", "{",
      "test", ".", "describe", "(", "`group ${", "user", ".", "name", "}`", ",", "(", ")", "=>", "{",
      "test", "(", "TEST", ",", "(", "{", "page", "}", ")", "=>", "{",
      "page", ".", "click", "(", '"#ok"', ")", ";",
      "}", ")", ";", "}", ")", ";", "}", ")", ";",
    ];
      const whitespace = fc
        .array(fc.constantFrom(" ", "\n", "\t", "\r\n", "  "), { maxLength: 3 })
        .map((parts) => parts.join(""));
      const title = fc.string({ unit: "binary" });
      const sourceOf = (describeTitle: string, testTitle: string, gaps: readonly string[]) =>
        tokens
          .map((token, index) => {
            const titles: Readonly<Record<string, string>> = {
              DESCRIBE: JSON.stringify(describeTitle),
              TEST: JSON.stringify(testTitle),
            };
            const text = titles[token] ?? token;
            const gap = gaps[index] ?? "";
            return `${text}${tokens[index + 1] === "=>" ? gap.replace(/[\r\n]/gu, " ") : gap}`;
          })
          .join("");

      fc.assert(
        fc.property(
          title,
          title,
          fc.array(whitespace, { minLength: tokens.length, maxLength: tokens.length }),
          (describeTitle, testTitle, gaps) => {
            const code = sourceOf(describeTitle, testTitle, gaps);
            const click = parseSource(code).calls.find((call) => calleeName(call) === "click");

            expect(testContextOf(click!)).toMatchObject({
              // Playwright drops a describe titled "" from the titlePath.
              titles: [
                ...(describeTitle === "" ? [] : [describeTitle]),
                "group ${user.name}",
                testTitle,
              ],
              isStatic: false,
            });
          },
        ),
        runOptions,
      );
    },
    HEAVY_TEST_TIMEOUT_MS,
  );
});
