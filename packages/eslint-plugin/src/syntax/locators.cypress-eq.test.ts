import { describe, expect, it } from "vitest";
import { parseSource } from "../../test/parse.js";
import { locatorOf } from "./locators.js";

function locatorIn(code: string, call = code) {
  return locatorOf(parseSource(code).call(call));
}

// Cypress's .eq(n) is .nth(n) only on a cy chain (decided in #55, D3).
describe("locatorOf with Cypress's .eq()", () => {
  it("recognizes .eq() on a cy chain as a refinement with its index and the query it refines", () => {
    expect(locatorIn('cy.get("li").eq(1)')).toMatchObject({
      kind: "refinement",
      method: "eq",
      index: { type: "Literal", value: 1 },
      base: { method: "get", framework: "cypress" },
    });
  });

  it("keeps a negative index as the unary expression it is", () => {
    expect(locatorIn('cy.get("li").eq(-1)')).toMatchObject({
      kind: "refinement",
      method: "eq",
      index: { type: "UnaryExpression", operator: "-", argument: { type: "Literal", value: 1 } },
    });
  });

  it.each(["items.eq(1)", 'page.locator("li").eq(1)'])(
    "does not treat %s as a refinement outside a cy chain",
    (code) => {
      expect(locatorIn(code)?.kind).not.toBe("refinement");
    },
  );
});
