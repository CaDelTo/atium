import { describe } from "vitest";
import { createRuleTester } from "../../test/rule-tester.js";
import { noPositionalLocator } from "./no-positional-locator.js";

// TypeScript wrappers are transparent (03-linter.md §11.3.1), also in the
// arguments: the index of `.nth()` and the options of `getByRole`.
describe("no-positional-locator: TypeScript wrappers in the arguments", () => {
  createRuleTester().run("no-positional-locator", noPositionalLocator, {
    valid: [
      'page.getByRole("row", { name: "Ada" } as const).nth(1);',
      'page.getByRole("row", { name: "Ada" } satisfies RoleOptions).first();',
      'page.getByRole("row", <RoleOptions>{ name: "Ada" }).nth(-1);',
    ],
    invalid: [
      {
        code: 'page.locator("li").nth(2 as number);',
        errors: [{ messageId: "nth", data: { method: "nth", index: "2" } }],
      },
      {
        code: 'page.locator("li").nth(1!);',
        errors: [{ messageId: "nth", data: { method: "nth", index: "1" } }],
      },
      {
        code: 'page.locator("li").nth(-(1 as number));',
        errors: [{ messageId: "firstOrLast", data: { method: "nth(-1)" } }],
      },
    ],
  });
});
