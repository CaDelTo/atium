import { AST_NODE_TYPES } from "@typescript-eslint/types";
import { describe, expect, it } from "vitest";
import { parseSource } from "../../test/parse.js";
import { classifyBlock } from "./structure.js";

function blockOf(code: string) {
  const parsed = parseSource(code);
  const [call] = parsed.program.body.flatMap((statement) =>
    statement.type === AST_NODE_TYPES.ExpressionStatement &&
    statement.expression.type === AST_NODE_TYPES.CallExpression
      ? [statement.expression]
      : [],
  );
  if (call === undefined) {
    throw new Error("The code has no top-level call");
  }
  return classifyBlock(call);
}

describe("classifyBlock", () => {
  describe("Playwright", () => {
    it.each([
      ["test", "test", []],
      ["test.only", "test", ["only"]],
      ["test.skip", "test", ["skip"]],
      ["test.fixme", "test", ["fixme"]],
      ["test.fail", "test", ["fail"]],
      ["test.describe", "describe", []],
      ["test.describe.only", "describe", ["only"]],
      ["test.describe.skip", "describe", ["skip"]],
      ["test.describe.fixme", "describe", ["fixme"]],
      ["test.describe.serial", "describe", ["serial"]],
      ["test.describe.serial.only", "describe", ["serial", "only"]],
      ["test.describe.parallel", "describe", ["parallel"]],
      ["test.describe.parallel.only", "describe", ["parallel", "only"]],
      ["test.step", "step", []],
      ["test.step.skip", "step", ["skip"]],
    ] as const)("recognizes %s as a %s with modifiers %j", (name, kind, modifiers) => {
      const block = blockOf(`${name}("checkout", async ({ page }) => {});`);

      expect(block).toMatchObject({ kind, name, modifiers });
    });

    it.each(["beforeEach", "afterEach", "beforeAll", "afterAll"])(
      "recognizes test.%s as a hook, with or without a title",
      (hook) => {
        expect(blockOf(`test.${hook}(async ({ page }) => {});`)).toMatchObject({
          kind: "hook",
          title: undefined,
        });
        expect(blockOf(`test.${hook}("log in", async ({ page }) => {});`)?.kind).toBe("hook");
      },
    );

    it("marks the declarations of test as Playwright and the rest as Mocha", () => {
      expect(blockOf('test.describe("cart", () => {});')?.runner).toBe("playwright");
      expect(blockOf('describe("cart", () => {});')?.runner).toBe("mocha");
    });

    it("takes the first argument as the title and the last as the callback", () => {
      const block = blockOf('test("pays", { tag: "@smoke" }, async ({ page }) => {});');

      expect(block?.title).toMatchObject({ type: "Literal", value: "pays" });
      expect(block?.callback.type).toBe("ArrowFunctionExpression");
    });

    it("accepts a function expression as the callback", () => {
      expect(blockOf('test("pays", async function () {});')?.callback.type).toBe(
        "FunctionExpression",
      );
    });

    it("recognizes a describe without title, which has no title node", () => {
      expect(blockOf("test.describe(() => {});")).toMatchObject({
        kind: "describe",
        title: undefined,
      });
    });

    it("recognizes a computed modifier written as a string", () => {
      expect(blockOf('test["only"]("pays", () => {});')?.modifiers).toEqual(["only"]);
    });
  });

  describe("Mocha and Cypress", () => {
    it.each([
      ["it", "test", []],
      ["it.only", "test", ["only"]],
      ["it.skip", "test", ["skip"]],
      ["describe", "describe", []],
      ["describe.only", "describe", ["only"]],
      ["describe.skip", "describe", ["skip"]],
      ["context", "describe", []],
      ["context.only", "describe", ["only"]],
      ["context.skip", "describe", ["skip"]],
    ] as const)("recognizes %s as a %s with modifiers %j", (name, kind, modifiers) => {
      expect(blockOf(`${name}("checkout", () => {});`)).toMatchObject({ kind, name, modifiers });
    });

    it.each(["before", "after", "beforeEach", "afterEach"])("recognizes %s as a hook", (hook) => {
      expect(blockOf(`${hook}(() => {});`)?.kind).toBe("hook");
    });
  });

  describe("calls that declare nothing", () => {
    it.each([
      ["an annotation without arguments", "test.skip();"],
      ["a conditional annotation", 'test.fixme(isMobile, "Not ready on mobile");'],
      [
        "a skip with a condition callback",
        'test.skip(({ browserName }) => browserName === "webkit");',
      ],
      ["the describe configuration", 'test.describe.configure({ mode: "serial" });'],
      ["a step without title", "test.step(async () => {});"],
      ["a test without callback", 'it("is pending");'],
      ["a test whose last argument is not a function", 'test("pays", callback);'],
      ["a test whose title is a spread", "test(...args, () => {});"],
      ["an unknown function", 'run("pays", () => {});'],
      ["a step with options after its body", 'test.step("pays", async () => {}, { box: true });'],
      ["a fixture extension", "test.extend({ page: async ({}, use) => {} });"],
      ["a callee that is not a chain of names", 'tests[0]("pays", () => {});'],
      ["a modifier written as a variable", 'test[mode]("pays", () => {});'],
    ])("ignores %s", (_case, code) => {
      expect(blockOf(code)).toBeUndefined();
    });
  });
});
