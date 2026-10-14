import { describe, expect, it } from "vitest";
import { parseSource } from "../../test/parse.js";
import { assertionOf, createNameMatcher } from "./assertions.js";

const noHelpers = createNameMatcher([]);

function assertionIn(code: string, call = code, patterns: readonly string[] = []) {
  return assertionOf(parseSource(code).call(call), createNameMatcher(patterns));
}

describe("assertionOf", () => {
  it.each([
    ["expect(page).toHaveURL(/cart/)", "expect(page)", "expect"],
    [
      'expect.soft(page.getByText("Saved")).toBeVisible()',
      'expect.soft(page.getByText("Saved"))',
      "expect.soft",
    ],
    ["expect.poll(() => count()).toBe(3)", "expect.poll(() => count())", "expect.poll"],
  ])("counts %s once, at the expect call", (code, call, name) => {
    expect(assertionIn(code, call)).toMatchObject({ kind: "expect", name });
    expect(assertionIn(code, code)).toBeUndefined();
  });

  it("counts each chained .should() and .and()", () => {
    const parsed = parseSource('cy.get("h1").should("be.visible").and("contain", "Cart");');

    expect(parsed.calls.map((call) => assertionOf(call, noHelpers)?.kind)).toEqual([
      "chained",
      "chained",
      undefined,
    ]);
  });

  it("does not count a plain function named should", () => {
    expect(assertionIn("should(value)")).toBeUndefined();
  });

  it("counts a helper named in assertFunctionNames", () => {
    expect(assertionIn("expectToast(page)", undefined, ["expectToast"])).toMatchObject({
      kind: "custom",
      name: "expectToast",
    });
  });

  it("counts a Page Object method that matches a glob", () => {
    expect(assertionIn("loginPage.verifyLoggedIn()", undefined, ["verify*"])?.name).toBe(
      "verifyLoggedIn",
    );
  });

  it("does not count a helper imported from another file that is not configured", () => {
    const code = 'import { checkCart } from "./helpers";\ncheckCart(page);';

    expect(assertionIn(code, "checkCart(page)")).toBeUndefined();
  });

  it("does not count a call without a name", () => {
    expect(assertionIn("factory()()", undefined, ["*"])).toBeUndefined();
  });
});

describe("createNameMatcher", () => {
  it.each([
    [["verify*"], "verify", true],
    [["verify*"], "verifyCart", true],
    [["verify*"], "reverifyCart", false],
    [["verify*"], "Verify", false],
    [["*Toast"], "expectToast", true],
    [["assert*Visible"], "assertCartVisible", true],
    [["expectToast"], "expectToastLater", false],
    [["a.b"], "axb", false],
    [["$check"], "$check", true],
    [["first", "second*"], "secondary", true],
  ] as const)("with %j, %s matches: %s", (patterns, name, matches) => {
    expect(createNameMatcher(patterns)(name)).toBe(matches);
  });

  it("matches nothing without patterns", () => {
    expect(noHelpers("expect")).toBe(false);
  });
});
