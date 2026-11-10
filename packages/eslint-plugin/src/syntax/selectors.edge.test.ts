import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { parseSource } from "../../test/parse.js";
import type { LocatorQuery } from "./locators.js";
import { locatorOf } from "./locators.js";
import { analyzeSelector, classifyLocator, normalizeSelector } from "./selectors.js";

// Fixed seed, so a failure reproduces (04-testing.md, "Determinismo").
const runOptions = { seed: 20261110, numRuns: 300 };

function queryIn(code: string): LocatorQuery {
  const locator = locatorOf(parseSource(code).call(code));
  if (locator?.kind !== "query") {
    throw new Error(`No locator query in ${code}`);
  }
  return locator;
}

const noI18n = { i18n: false };

describe("normalizeSelector edge cases", () => {
  it.each([
    ["[a\\:b=x]", "[a\\:b=x]"],
    ["[xlink|href=x]", "[xlink|href=x]"],
    ["[a='x\"y']", "[a='x\"y']"],
    ["[a='x']", '[a="x"]'],
    ["[a=x i]", '[a="x" i]'],
    ["[A=x]", '[a="x"]'],
    ["css=  A   >   B ", "a > b"],
    ["UL>LI", "ul > li"],
    ["a,b", "a, b"],
    ["*", "*"],
    ["p::before", "p::before"],
  ])("normalizes %s to %s", (input, expected) => {
    expect(normalizeSelector(input)).toBe(expected);
  });

  it.each(["> a", "a >", "a > > b", ", a", "a,", "a,,b", "a >> b"])(
    "leaves the malformed selector %j unchanged but trimmed",
    (input) => {
      expect(normalizeSelector(` ${input} `)).toBe(input);
    },
  );

  it.each(["", "   ", "\t\n"])("returns an empty string for blank input %j", (input) => {
    expect(normalizeSelector(input)).toBe("");
  });

  it("keeps whitespace inside quotes in XPath", () => {
    expect(normalizeSelector("//a[@title='x   y']  /b")).toBe("//a[@title='x   y'] /b");
  });

  it("does not throw on an unclosed quote", () => {
    expect(() => normalizeSelector("a[b='c   d")).not.toThrow();
    expect(() => normalizeSelector("//a[@b='c   d")).not.toThrow();
  });

  it("handles Unicode names and Windows line endings", () => {
    expect(normalizeSelector("button.日本語\r\n>\r\nspan")).toBe("button.日本語 > span");
  });

  it("handles a very long selector in reasonable time", () => {
    const long = Array.from({ length: 5000 }, () => "a").join(" > ");
    expect(normalizeSelector(long)).toBe(long);
  });
});

describe("analyzeSelector CSS edge cases", () => {
  it.each([
    ["li:NTH-CHILD(2)", ["nth-child"]],
    ["li:has(li:nth-child(2))", []],
    ["li:not(.a):nth-of-type(2n+1)", ["nth-of-type"]],
  ])("finds the positional pseudo-classes of %s: %j", (selector, expected) => {
    expect(analyzeSelector(selector)).toMatchObject({
      kind: "css",
      positionalPseudoClasses: expected,
    });
  });

  it("lowercases attribute and type names", () => {
    expect(analyzeSelector("BUTTON[Data-TestId=x]")).toMatchObject({
      types: ["button"],
      attributes: ["data-testid"],
    });
  });

  it("reads a universal selector and a pseudo-element without recording a type", () => {
    expect(analyzeSelector("*::before")).toMatchObject({ kind: "css", types: [], combinators: 0 });
  });

  it("accepts the css= prefix with spaces", () => {
    expect(analyzeSelector("css=  a  >  b ")).toMatchObject({ kind: "css", combinators: 1 });
  });

  it.each(["> a", "a >", "a,,b", ", a", "a,", "", "   ", "text=Pay", "@user", "a >> b"])(
    "reports %j as unknown",
    (selector) => {
      expect(analyzeSelector(selector)).toEqual({ kind: "unknown" });
    },
  );
});

describe("analyzeSelector XPath edge cases", () => {
  it.each([
    ["//li[last()-1]", 1],
    ["//li[ 2 ]", 1],
    ["//li[a[1]]", 1],
    ["//li[a[b]]", 0],
    ["//li[@id='[2]']", 0],
    ['//li[@id="x\'[2]"]', 0],
    ["//li[2][3]", 2],
    ["//li[position() = 1]", 1],
    ["//li[]", 0],
    ["//li[@a='x][2]", 0],
    ["//li[2", 0],
    ["//li]]", 0],
  ])("counts %s as %i positional predicates", (selector, count) => {
    expect(analyzeSelector(selector)).toMatchObject({ kind: "xpath", positionalPredicates: count });
  });

  it.each([
    ["(/html/body)[1]", true],
    ["/html/body", true],
    ["//div", false],
    ["(//div)[1]", false],
    ["xpath=/html", true],
    ["xpath=//html", false],
    ["../a", false],
  ])("reads %s as absolute: %s", (selector, absolute) => {
    expect(analyzeSelector(selector)).toMatchObject({ kind: "xpath", absolute });
  });

  it("collects attributes from nested predicates and namespaces", () => {
    expect(analyzeSelector("//a[@data-testid='x' and b[@xml:lang='en']]")).toMatchObject({
      attributes: ["data-testid", "xml:lang"],
    });
  });

  it("does not throw on an unclosed bracket or quote", () => {
    expect(() => analyzeSelector("//a[@b='c")).not.toThrow();
    expect(() => analyzeSelector("//a[[[[")).not.toThrow();
  });

  it("handles a very long predicate chain in reasonable time", () => {
    const long = `//a${"[b".repeat(20000)}${"]".repeat(20000)}`;
    expect(analyzeSelector(long)).toMatchObject({ kind: "xpath" });
  });
});

describe("classifyLocator edge cases", () => {
  it.each([
    ['cy.get("ul > li:nth-child(2)")', 1],
    ['cy.get("[data-testid=a], .css-1a2b3c")', 1],
    ['cy.get("[data-testid=a], [data-cy=b]")', 3],
    ['cy.get("[data-testid=a], #main")', 2],
    ["cy.get(\"//div[@data-testid='a']\")", 3],
    ['cy.get("//div[2]")', 1],
    ['cy.get("@alias")', undefined],
    ["cy.get(selector)", undefined],
  ])("classifies %s as level %s", (code, level) => {
    expect(classifyLocator(queryIn(code), noI18n)).toBe(level);
  });

  it("classifies getByRole by its name option even when options are spread", () => {
    expect(
      classifyLocator(queryIn('page.getByRole("button", { ...opts, name: "Pay" })'), noI18n),
    ).toBe(5);
  });
});

describe("selector properties", () => {
  const simple = fc.constantFrom(
    "a",
    "DIV",
    ".item",
    "#main",
    "#id-123",
    "[Data-TestId='x']",
    "[a=b i]",
    "li:nth-child(2)",
    "li:first-child",
    "*",
  );
  const css = fc
    .array(fc.tuple(simple, fc.constantFrom(" ", ">", " > ", "+", "~", "  ")), {
      minLength: 1,
      maxLength: 4,
    })
    .chain((parts) =>
      fc.constantFrom("", ", ").map((sep) => parts.map(([s]) => s).join(" > ") + sep + "span"),
    );

  it("keeps the analysis of CSS after normalizing it", () => {
    fc.assert(
      fc.property(css, (selector) => {
        expect(analyzeSelector(normalizeSelector(selector))).toEqual(analyzeSelector(selector));
      }),
      runOptions,
    );
  });

  it("is idempotent and never throws on arbitrary text", () => {
    fc.assert(
      fc.property(fc.string({ unit: "binary" }), (text) => {
        const once = normalizeSelector(text);
        expect(normalizeSelector(once)).toBe(once);
        expect(() => analyzeSelector(text)).not.toThrow();
      }),
      runOptions,
    );
  });
});
