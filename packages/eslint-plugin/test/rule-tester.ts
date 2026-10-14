import { RuleTester } from "@typescript-eslint/rule-tester";
import { afterAll, describe, it } from "vitest";

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

/**
 * Creates a `RuleTester` that runs its cases as Vitest tests and parses them
 * as TypeScript, like a suite linted with typescript-eslint.
 *
 * @param settings - The `settings` of the config, such as `{ atium: { i18n: true } }`.
 * @returns The tester; call `run(name, rule, { valid, invalid })` inside a test file.
 */
export function createRuleTester(settings: Readonly<Record<string, unknown>> = {}): RuleTester {
  return new RuleTester({ settings });
}
