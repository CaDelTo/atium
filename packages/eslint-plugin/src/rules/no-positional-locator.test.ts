import { ruleDocsUrl } from "@atium/core/pure";
import { describe, expect, it } from "vitest";
import { createRuleTester } from "../../test/rule-tester.js";
import { noPositionalLocator, RULE_POSITIONAL_LOCATOR } from "./no-positional-locator.js";
import type { PositionalLocatorOptions } from "./no-positional-locator.js";

/** The expected report: `nth` with the method and its index, or `firstOrLast` with the method. */
type PositionalError =
  | { readonly messageId: "nth"; readonly data: { method: "nth" | "eq"; index: string } }
  | { readonly messageId: "firstOrLast"; readonly data: { method: string } };

/** `.nth(n)` or `.eq(n)` with `n` at or above `minIndex`. */
function nth(method: "nth" | "eq", index: string): PositionalError {
  return { messageId: "nth", data: { method, index } };
}

/** `.first()`, `.last()`, or a negative index written as `"nth(-1)"`. */
function firstOrLast(method: string): PositionalError {
  return { messageId: "firstOrLast", data: { method } };
}

/**
 * An invalid case: one statement on line 1 and one error on the property of
 * its last refinement (the `nth`, `first`, `last` or `eq` identifier, the
 * name before `(` in `data.method`). No autofix and no suggestion
 * (03-linter.md §11.2).
 */
function positionalCase(code: string, error: PositionalError, options?: PositionalLocatorOptions) {
  const refinement = error.data.method.split("(")[0] ?? error.data.method;
  const column = code.lastIndexOf(`.${refinement}(`) + 2;
  return {
    code,
    output: null,
    ...(options === undefined ? {} : { options: [options] satisfies [PositionalLocatorOptions] }),
    errors: [
      {
        ...error,
        line: 1,
        column,
        endLine: 1,
        endColumn: column + refinement.length,
        suggestions: [],
      },
    ],
  };
}

const minIndexTwo: PositionalLocatorOptions = { minIndex: 2 };

describe("AC-1: no-positional-locator", () => {
  it("AC-1: meta.docs carries the E2E004 catalog entry (passes with the stub; the red comes from the invalid cases)", () => {
    const { meta } = noPositionalLocator;

    expect(RULE_POSITIONAL_LOCATOR).toBe("E2E004");
    expect(meta.docs).toMatchObject({
      code: "E2E004",
      severity: "warning",
      category: "selectors",
      confidence: "medium",
      source: "rule",
      recommended: false,
    });
    expect(meta.docs?.url).toBe(ruleDocsUrl("E2E004"));
    expect(meta.fixable).toBeUndefined();
    expect(meta.hasSuggestions).toBeUndefined();
  });

  createRuleTester().run("no-positional-locator", noPositionalLocator, {
    valid: [
      // getByRole with a name: the "does not detect" case of §11.3.
      'page.getByRole("button", { name: "Pay" }).nth(1);',
      // A getByRole with a name is unique (D2): .first() is not reported.
      'page.getByRole("button", { name: "Pay" }).first();',
      // The getByRole with a name is found through other calls of the chain.
      'page.getByRole("listitem", { name: "Ada" }).filter({ hasText: "x" }).nth(1);',
      // A getByTestId is unique (D2).
      'page.getByTestId("row").first();',
      // n > 0 (§11.3): index 0 is below the default minIndex of 1 (D1).
      'page.locator("li").nth(0);',
      // Not a literal: the index is unknown (D1).
      'page.locator("li").nth(i);',
      'page.locator("li").nth(1 + 1);',
      // No recognized base: uniqueness is unknown (D2).
      "items.first();",
      // Below a configured minIndex (D1).
      { code: 'page.locator("li").nth(1);', options: [minIndexTwo] },
      // .eq() outside a cy chain is not a refinement (D3).
      "items.eq(1);",
      // A negative index is a .last(): no recognized base, not reported (D1, D2).
      "items.nth(-1);",
      // A negative index on a unique base (D1, D2).
      'page.getByRole("row", { name: "Ada" }).nth(-1);',
      'page.getByTestId("row").nth(-1);',
      // Not an integer.
      'page.locator("li").nth(1.5);',
    ],
    invalid: [
      // .nth(n) with n >= minIndex (default 1), whatever the base (D1).
      positionalCase('page.locator("li").nth(1);', nth("nth", "1")),
      // getByRole without a name.
      positionalCase('page.getByRole("listitem").nth(2);', nth("nth", "2")),
      positionalCase('page.getByText("Item").nth(1);', nth("nth", "1")),
      // No recognized base: .nth() is reported anyway (D1).
      positionalCase("items.nth(1);", nth("nth", "1")),
      // D2 (unique bases) only exempts .first()/.last(), not .nth().
      positionalCase('page.getByTestId("row").nth(1);', nth("nth", "1")),
      // Cypress's .eq(n) on a cy chain (D3).
      positionalCase('cy.get("li").eq(1);', nth("eq", "1")),
      // At a configured minIndex (D1).
      positionalCase('page.locator("li").nth(2);', nth("nth", "2"), minIndexTwo),

      // .first()/.last() on a base that is not unique (D2).
      positionalCase('page.locator("li").first();', firstOrLast("first()")),
      positionalCase('page.getByRole("row").last();', firstOrLast("last()")),
      positionalCase('page.locator("#cart li").first();', firstOrLast("first()")),
      positionalCase('page.locator("[data-testid=list] li").first();', firstOrLast("first()")),
      positionalCase('cy.get("li").first();', firstOrLast("first()")),
      positionalCase('cy.get("li").last();', firstOrLast("last()")),
      // A negative literal index is a .last() (D1).
      positionalCase('page.locator("li").nth(-1);', firstOrLast("nth(-1)")),
      positionalCase('page.locator("li").nth(-2);', firstOrLast("nth(-2)")),
      positionalCase('cy.get("li").eq(-1);', firstOrLast("eq(-1)")),
      // A negative index does not depend on minIndex (D1).
      positionalCase('page.locator("li").nth(-1);', firstOrLast("nth(-1)"), minIndexTwo),
    ],
  });
});
