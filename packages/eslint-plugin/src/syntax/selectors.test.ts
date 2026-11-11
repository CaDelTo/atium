import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { parseSource } from "../../test/parse.js";
import type { LocatorQuery } from "./locators.js";
import { locatorOf } from "./locators.js";
import { analyzeSelector, classifyLocator, normalizeSelector, selectorText } from "./selectors.js";

// Fixed seed, so a failure reproduces (04-testing.md, "Determinismo").
const runOptions = { seed: 20261110, numRuns: 300 };

/** The locator query whose source is exactly `code`. */
function queryIn(code: string): LocatorQuery {
  const locator = locatorOf(parseSource(code).call(code));
  if (locator?.kind !== "query") {
    throw new Error(`No locator query in ${code}`);
  }
  return locator;
}

const noI18n = { i18n: false };
const withI18n = { i18n: true };

describe("analyzeSelector", () => {
  describe("CSS positional pseudo-classes (03-linter.md §11.3, E2E002)", () => {
    it.each([
      ["li:nth-child(2)", ["nth-child"]],
      ["li:nth-of-type(odd)", ["nth-of-type"]],
      ["li:first-child", []],
      ["li.item", []],
    ])("AC-1: in %s, finds the positional pseudo-classes %j", (selector, expected) => {
      expect(analyzeSelector(selector)).toMatchObject({
        kind: "css",
        positionalPseudoClasses: expected,
      });
    });
  });

  describe("CSS combinators (03-linter.md §11.3, E2E002)", () => {
    it.each([
      ["div > ul li + a", 3],
      ["button.primary", 0],
      ["a ~ b", 1],
      ["a b, c > d > e", 2],
    ])(
      "AC-1: counts %s as %i combinators, the largest of any item in a list",
      (selector, count) => {
        expect(analyzeSelector(selector)).toMatchObject({ kind: "css", combinators: count });
      },
    );
  });

  describe("CSS generated classes (03-linter.md §11.3, E2E002)", () => {
    it.each(["css-1a2b3c", "css-1a2b3c-Label", "sc-bdVaJa", "jsx-123456"])(
      "AC-1: reports .%s as a generated class",
      (name) => {
        expect(analyzeSelector(`.${name}`)).toMatchObject({
          kind: "css",
          classes: [name],
          generatedClasses: [name],
        });
      },
    );

    it.each(["card", "css-grid", "jsx-wrapper"])(
      "AC-1: does not report .%s as a generated class",
      (name) => {
        expect(analyzeSelector(`.${name}`)).toMatchObject({
          kind: "css",
          classes: [name],
          generatedClasses: [],
        });
      },
    );

    it("AC-1: lists every class without the dot, and only the generated ones as generated", () => {
      const analysis = analyzeSelector("button.card.css-1a2b3c");

      expect(analysis).toMatchObject({ kind: "css", generatedClasses: ["css-1a2b3c"] });
      expect(analysis).toMatchObject({
        classes: expect.arrayContaining(["card", "css-1a2b3c"]) as unknown,
      });
      expect(analysis.kind === "css" ? analysis.classes : []).toHaveLength(2);
    });
  });

  describe("CSS ids with a numeric sequence (03-linter.md §11.3, E2E002)", () => {
    it.each(["ember123", "react-select-456-input"])(
      "AC-1: reports #%s as an id with a numeric sequence",
      (id) => {
        expect(analyzeSelector(`#${id}`)).toMatchObject({
          kind: "css",
          ids: [id],
          numericIds: [id],
        });
      },
    );

    it.each(["step2", "h1", "submit"])("AC-1: does not report #%s as numeric", (id) => {
      expect(analyzeSelector(`#${id}`)).toMatchObject({ kind: "css", ids: [id], numericIds: [] });
    });
  });

  describe("CSS types and attributes", () => {
    it("AC-1: lists types and attribute names in lowercase", () => {
      expect(analyzeSelector("BUTTON[Data-TestId=x]")).toMatchObject({
        kind: "css",
        types: ["button"],
        attributes: ["data-testid"],
      });
    });

    it("AC-1: reads a selector with the css= prefix as CSS", () => {
      expect(analyzeSelector("css=button.primary")).toMatchObject({
        kind: "css",
        types: ["button"],
        classes: ["primary"],
      });
    });
  });

  describe("XPath (03-linter.md §11.3, E2E003)", () => {
    it.each(["xpath=//a", "//a", "/html", "(//a)[1]", "../a"])(
      "AC-1: reads %s as XPath by its prefix",
      (selector) => {
        expect(analyzeSelector(selector)).toMatchObject({ kind: "xpath" });
      },
    );

    it.each([
      ["//tr[2]", 1],
      ["(//li)[last()]", 1],
      ["//li[position()=1]", 1],
      ["//button[@data-testid='x']", 0],
      ["//a[@title='[2]']", 0],
    ])("AC-1: in %s, counts %i positional predicates", (selector, count) => {
      expect(analyzeSelector(selector)).toMatchObject({
        kind: "xpath",
        positionalPredicates: count,
      });
    });

    it.each([
      ["/html/body/div", true],
      ["//tr[2]", false],
      ["//button[@data-testid='x']", false],
    ])("AC-1: in %s, absolute is %s", (selector, absolute) => {
      expect(analyzeSelector(selector)).toMatchObject({ kind: "xpath", absolute });
    });

    it("AC-1: lists the attributes an XPath tests, which are not positional", () => {
      expect(analyzeSelector("//button[@data-testid='x']")).toEqual({
        kind: "xpath",
        positionalPredicates: 0,
        absolute: false,
        attributes: ["data-testid"],
      });
    });
  });

  describe("unknown selectors", () => {
    it.each([
      ["CSS that does not parse", "[["],
      ["an empty selector", ""],
      ["the text engine", "text=Pay"],
      ["the role engine", "role=button"],
      ["a chain", "a >> b"],
      ["a Cypress alias", "@alias"],
    ])("AC-1: returns unknown for %s, without throwing", (_case, selector) => {
      expect(analyzeSelector(selector)).toEqual({ kind: "unknown" });
    });
  });
});

describe("classifyLocator", () => {
  describe("examples of the hierarchy (06-selector-advisor.md §14.1)", () => {
    it.each([
      ['page.getByRole("button", { name: "Pay" })', 5],
      ['page.getByLabel("Email")', 4],
      ['page.getByText("Checkout")', 4],
      ['page.getByTestId("checkout")', 3],
      ['page.locator("[data-testid=checkout]")', 3],
      ['page.locator("button[name=submit]")', 2],
      ['page.locator("div > div:nth-child(2) > button")', 1],
    ])("AC-2: classifies %s as level %i", (code, level) => {
      expect(classifyLocator(queryIn(code), noI18n)).toBe(level);
    });
  });

  describe("getBy* locators, by their method", () => {
    it.each([
      ['page.getByRole("button")', 4],
      ['page.getByPlaceholder("Email")', 4],
      ['page.getByAltText("Logo")', 4],
      ['page.getByTitle("Close")', 4],
      ["page.getByTestId(id)", 3],
      ['page.getByRole("button", { name })', 5],
    ])("AC-2: classifies %s as level %i", (code, level) => {
      expect(classifyLocator(queryIn(code), noI18n)).toBe(level);
    });
  });

  describe("CSS and XPath selectors, by what they use", () => {
    it.each([
      ['page.locator("[data-cy=x]")', 3],
      ['page.locator("[data-test=x]")', 3],
      ['page.locator("[data-test-id=x]")', 3],
      ['page.locator("[data-qa=x]")', 3],
      ['cy.get("[data-testid=x]")', 3],
      ['cy.get("[data-cy=x]")', 3],
      ['cy.get("[data-test=x]")', 3],
      ['cy.get("[data-test-id=x]")', 3],
      ['cy.get("[data-qa=x]")', 3],
      ['page.$("[data-testid=x]")', 3],
      ['page.locator("#submit")', 2],
      ['page.locator(".btn")', 1],
      ['page.locator("div > span")', 1],
      ['page.locator(".css-1a2b3c")', 1],
      ['page.locator("#ember123")', 1],
      ['page.locator("//tr[2]")', 1],
      ['page.locator("/html/body/div")', 1],
      ["page.locator(\"//button[@name='x']\")", 2],
      ["page.locator(\"//button[@data-testid='x']\")", 3],
    ])("AC-2: classifies %s as level %i", (code, level) => {
      expect(classifyLocator(queryIn(code), noI18n)).toBe(level);
    });

    it.each([
      [
        "a test id followed by a positional part",
        'page.locator("[data-testid=list] li:nth-child(2)")',
      ],
      ["a list with a test id and a class", 'page.locator("[data-testid=a], .btn")'],
    ])("AC-2: classifies %s by its lowest part, level 1", (_case, code) => {
      expect(classifyLocator(queryIn(code), noI18n)).toBe(1);
    });
  });

  describe("locators it cannot classify", () => {
    it.each([
      ["a selector in a variable", "page.locator(sel)"],
      ["an unknown selector", 'page.locator("text=Pay")'],
      ["a getBy* the hierarchy does not list", 'page.getByFoo("x")'],
    ])("AC-2: returns undefined for %s", (_case, code) => {
      expect(classifyLocator(queryIn(code), noI18n)).toBeUndefined();
    });
  });

  describe("i18n (06-selector-advisor.md §14.1)", () => {
    it.each([
      'page.getByText("Checkout")',
      'page.getByLabel("Email")',
      'page.getByPlaceholder("Email")',
      'page.getByAltText("Logo")',
      'page.getByTitle("Close")',
    ])("AC-2: with i18n, drops %s to level 2, below the test id", (code) => {
      expect(classifyLocator(queryIn(code), withI18n)).toBe(2);
    });

    it.each([
      ['page.getByTestId("checkout")', 3],
      ['page.getByRole("button", { name: "Pay" })', 5],
    ])("AC-2: with i18n, keeps %s at level %i", (code, level) => {
      expect(classifyLocator(queryIn(code), withI18n)).toBe(level);
    });
  });
});

describe("selectorText", () => {
  it.each([
    ['page.locator("#cart > li")', "#cart > li"],
    ["page.locator(`#cart > li`)", "#cart > li"],
    ['page.locator("a" as const)', "a"],
    ['page.getByTestId("checkout")', "checkout"],
  ])("AC-2: reads the text of %s", (code, text) => {
    expect(selectorText(queryIn(code))).toBe(text);
  });

  it.each([
    ["a variable", "page.locator(sel)"],
    ["a template with ${}", "page.locator(`#${id}`)"],
    ["a spread", "page.locator(...args)"],
    ["no argument", "page.locator()"],
  ])("AC-2: returns undefined for %s", (_case, code) => {
    expect(selectorText(queryIn(code))).toBeUndefined();
  });
});

describe("normalizeSelector", () => {
  it.each([
    ["DIV  >  .Item[ Name='x' ]", 'div > .Item[name="x"]'],
    ["a,b", "a, b"],
    ["  //a   [ @id = 'x  y' ]  ", "//a [ @id = 'x  y' ]"],
  ])("AC-3: normalizes %j to %j", (selector, expected) => {
    expect(normalizeSelector(selector)).toBe(expected);
  });

  it("AC-3: does not reorder classes", () => {
    expect(normalizeSelector(".a.b")).not.toBe(normalizeSelector(".b.a"));
  });
});

describe("properties", () => {
  const ident = fc.stringMatching(/^[A-Za-z][\w-]{0,7}$/u);
  const ws = fc.constantFrom("", " ", "   ", "\t", "\n ");
  const someWs = fc.constantFrom(" ", "  ", "\t", " \n ");
  const quotedValue = fc.stringMatching(/^[\w ./:-]{0,8}$/u);
  const attribute = fc
    .tuple(
      ws,
      ident,
      ws,
      fc.constantFrom("=", "^=", "$=", "*=", "~=", "|="),
      ws,
      fc.oneof(
        ident,
        quotedValue.map((value) => `'${value}'`),
        quotedValue.map((value) => `"${value}"`),
      ),
      ws,
    )
    .map((parts) => `[${parts.join("")}]`);
  const subclass = fc.oneof(
    ident.map((name) => `.${name}`),
    ident.map((name) => `#${name}`),
    ident.map((name) => `[${name}]`),
    attribute,
  );
  const compound = fc
    .tuple(fc.option(ident, { nil: "" }), fc.array(subclass, { maxLength: 3 }))
    .filter(([type, subclasses]) => type !== "" || subclasses.length > 0)
    .map(([type, subclasses]) => type + subclasses.join(""));
  const combinator = fc.oneof(
    someWs,
    fc.tuple(ws, fc.constantFrom(">", "+", "~"), ws).map((parts) => parts.join("")),
  );
  const complex = fc
    .tuple(compound, fc.array(fc.tuple(combinator, compound), { maxLength: 3 }))
    .map(([first, rest]) => first + rest.map((parts) => parts.join("")).join(""));
  const cssSelector = fc
    .tuple(ws, complex, fc.array(fc.tuple(ws, ws, complex), { maxLength: 2 }), ws)
    .map(
      ([lead, first, rest, trail]) =>
        lead +
        first +
        rest.map(([before, after, item]) => `${before},${after}${item}`).join("") +
        trail,
    );
  // Characters that reach the CSS and XPath branches of the parser.
  const selectorAlphabet = fc.string({
    unit: fc.constantFrom(..."[]()/'\":>+~#.,=@*\\ \tax1-".split("")),
  });

  it.each([
    ["any string", fc.string()],
    ["any unicode string", fc.string({ unit: "binary" })],
    ["selector-like text", selectorAlphabet],
  ])("AC-3: analyzeSelector and normalizeSelector never throw on %s", (_case, text) => {
    fc.assert(
      fc.property(text, (selector) => {
        analyzeSelector(selector);
        normalizeSelector(selector);
      }),
      runOptions,
    );
  });

  it.each([
    ["any string", fc.string()],
    ["selector-like text", selectorAlphabet],
    ["a valid CSS selector", cssSelector],
  ])("AC-3: normalizeSelector is idempotent on %s", (_case, text) => {
    fc.assert(
      fc.property(text, (selector) => {
        const once = normalizeSelector(selector);

        expect(normalizeSelector(once)).toBe(once);
      }),
      runOptions,
    );
  });
});

describe("time", () => {
  // 03-linter.md §11.3 and 06-security.md, "Entradas": linear time on the text
  // of a selector. A quadratic algorithm needs about 10^11 steps on 1 MiB,
  // minutes instead of milliseconds, so this generous budget is not flaky.
  const ONE_MIB = 1024 * 1024;
  const BUDGET_MS = 2000;

  function fill(unit: string, prefix = "", suffix = ""): string {
    return prefix + unit.repeat(Math.ceil(ONE_MIB / unit.length)) + suffix;
  }

  const inputs: readonly (readonly [string, string])[] = [
    ["an XPath of open brackets", fill("[", "/")],
    ["a long Emotion-like class", fill("1", ".css-", "x")],
    ["many descendant combinators", fill("a ")],
    ["many quotes", fill("'")],
    ["a long numeric id", fill("1", "#")],
    ["many positional predicates", fill("[1]", "//a")],
    ["an unterminated attribute value", fill("x ", "[a='")],
  ];
  const functions = [
    ["analyzeSelector", analyzeSelector],
    ["normalizeSelector", normalizeSelector],
  ] as const;
  const cases = functions.flatMap(([name, run]) =>
    inputs.map(([label, text]) => ({ name, label, run, text })),
  );

  it.each(cases)("AC-3: $name is linear on 1 MiB of $label", ({ run, text }) => {
    const start = performance.now();
    run(text);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(BUDGET_MS);
  });
});
