import { describe, expect, it } from "vitest";
import { parseSource } from "../../test/parse.js";
import { locatorOf } from "./locators.js";

function locatorIn(code: string, call = code) {
  return locatorOf(parseSource(code).call(call));
}

describe("locatorOf", () => {
  describe("queries", () => {
    it.each([
      ['page.locator(".cart")', "locator"],
      ['page.$(".cart")', "$"],
      ['page.getByRole("button")', "getByRole"],
      ['page.getByText("Saved")', "getByText"],
      ['page.getByTestId("cart")', "getByTestId"],
      ['frame.locator("li").getByLabel("Name")', "getByLabel"],
    ])("recognizes %s as a Playwright query by %s", (code, method) => {
      expect(locatorIn(code)).toMatchObject({ kind: "query", method, framework: "playwright" });
    });

    it("recognizes cy.get as a Cypress query", () => {
      expect(locatorIn('cy.get("[data-cy=cart]")')).toMatchObject({
        kind: "query",
        method: "get",
        framework: "cypress",
      });
    });

    it("keeps the first argument as the selector", () => {
      expect(locatorIn('page.locator("#cart > li")')).toMatchObject({
        selector: { type: "Literal", value: "#cart > li" },
      });
    });

    it.each([
      ["a method that only starts with getBy", "page.getBy()"],
      ["a lowercase getBy", 'page.getbyRole("button")'],
      ["a Playwright method on a cy chain", 'cy.locator(".cart")'],
      ["get outside a cy chain", 'map.get("key")'],
      ["a plain function", 'locator(".cart")'],
      ["a private method", 'this.#locator(".cart")'],
    ])("ignores %s", (_case, code) => {
      expect(locatorIn(code)).toBeUndefined();
    });

    it.each([
      ['page.getByRole("button", { name: "Pay" })', true],
      ['page.getByRole("button", { \'name\': "Pay" })', true],
      ['page.getByRole("button", { exact: true })', false],
      ['page.getByRole("button", { [name]: "Pay" })', false],
      ['page.getByRole("button", options)', false],
      ['page.getByRole("button")', false],
      ['page.getByText("Pay", { name: "x" })', false],
    ])("in %s, hasName is %s", (code, hasName) => {
      expect(locatorIn(code)).toMatchObject({ kind: "query", hasName });
    });
  });

  describe("refinements", () => {
    it("recognizes .nth() with its index and the query it refines", () => {
      expect(locatorIn('page.locator("li").nth(2)')).toMatchObject({
        kind: "refinement",
        method: "nth",
        index: { type: "Literal", value: 2 },
        base: { method: "locator" },
      });
    });

    it.each(["first", "last"])("recognizes .%s() without an index", (method) => {
      expect(locatorIn(`cy.get("li").${method}()`)).toMatchObject({
        kind: "refinement",
        method,
        index: undefined,
        base: { method: "get", framework: "cypress" },
      });
    });

    it("finds the base query through other calls of the chain", () => {
      const code = 'page.getByRole("row").filter({ hasText: "Ada" }).nth(1)';

      expect(locatorIn(code)).toMatchObject({ base: { method: "getByRole" } });
    });

    it("finds the base query through property accesses", () => {
      expect(locatorIn('page.getByRole("row").foo.bar().nth(1)')).toMatchObject({
        base: { method: "getByRole" },
      });
    });

    it.each(['page.locator("a")!.first()', 'page.locator("a")?.first()'])(
      "finds the base query through %s",
      (code) => {
        expect(locatorIn(code)).toMatchObject({ kind: "refinement", base: { method: "locator" } });
      },
    );

    it("has no base when the chain starts from a variable", () => {
      expect(locatorIn("rows.nth(1)")).toMatchObject({ kind: "refinement", base: undefined });
    });

    it("exposes the getByRole with name under .nth(), which E2E004 does not report", () => {
      const code = 'page.getByRole("listitem", { name: "Ada" }).nth(1)';

      expect(locatorIn(code)).toMatchObject({ base: { method: "getByRole", hasName: true } });
    });

    it("ignores a plain function named first", () => {
      expect(locatorIn("first(items)")).toBeUndefined();
    });
  });
});
