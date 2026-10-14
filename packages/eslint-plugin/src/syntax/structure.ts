import { AST_NODE_TYPES } from "@typescript-eslint/types";
import type { TSESTree } from "@typescript-eslint/types";
import {
  BLOCK_MODIFIERS,
  DESCRIBE_DECLARATIONS,
  HOOK_DECLARATIONS,
  PLAYWRIGHT_ROOT,
  STEP_DECLARATIONS,
  TEST_DECLARATIONS,
} from "../defaults.js";
import type { FunctionNode } from "./ast.js";
import { isFunctionNode, isOneOf, memberPath } from "./ast.js";

/** What a declaration declares. */
export type BlockKind = "test" | "describe" | "hook" | "step";

/** Whose syntax a declaration follows: Playwright's `test.*` or Mocha's, as in Cypress. */
export type BlockRunner = "playwright" | "mocha";

/** A modifier in the name of a declaration, such as `only` in `test.describe.only`. */
export type BlockModifier = (typeof BLOCK_MODIFIERS)[number];

/**
 * A call that declares a test, describe, hook or step, in Playwright or in
 * Mocha/Cypress (03-linter.md §11.3.1).
 */
export interface TestBlock {
  /** What the call declares. */
  readonly kind: BlockKind;
  /** Dotted name of the callee, such as `test.describe.only`. */
  readonly name: string;
  /** Whose syntax the declaration follows. */
  readonly runner: BlockRunner;
  /** Modifiers in the name, in order; empty for a plain `test(...)`. */
  readonly modifiers: readonly BlockModifier[];
  /** The declaring call. */
  readonly node: TSESTree.CallExpression;
  /**
   * The title argument. `undefined` for a describe without title, which adds
   * no level to the `titlePath`, and for a hook without description.
   */
  readonly title: TSESTree.Expression | undefined;
  /** The function with the body of the block. */
  readonly callback: FunctionNode;
}

const KINDS: ReadonlyMap<string, BlockKind> = new Map<string, BlockKind>([
  ...TEST_DECLARATIONS.map((name) => [name, "test"] as const),
  ...DESCRIBE_DECLARATIONS.map((name) => [name, "describe"] as const),
  ...HOOK_DECLARATIONS.map((name) => [name, "hook"] as const),
  ...STEP_DECLARATIONS.map((name) => [name, "step"] as const),
]);

/** Kinds whose declaration always has a title, so a call without one is something else. */
const TITLED: ReadonlySet<BlockKind> = new Set<BlockKind>(["test", "step"]);

/** The title argument: the first one, when the callback is not the only one. */
function titleArgument(call: TSESTree.CallExpression): TSESTree.Expression | undefined {
  const [first] = call.arguments;
  return call.arguments.length > 1 &&
    first !== undefined &&
    first.type !== AST_NODE_TYPES.SpreadElement
    ? first
    : undefined;
}

/**
 * Recognizes a call that declares a test, describe, hook or step.
 * TypeScript wrappers in the callee, such as `test.only!`, are transparent.
 *
 * A declaration ends with its callback. So `test.skip()` and
 * `test.skip(isMobile, "reason")`, which annotate the running test, are not
 * declarations; neither is `test.describe.configure({ mode: "serial" })`.
 * Nor is a step with options after its body, `test.step(title, body, { box: true })`:
 * its nodes still belong to the test that contains it.
 *
 * @param call - Any call.
 * @returns The block, or `undefined` when the call declares none.
 */
export function classifyBlock(call: TSESTree.CallExpression): TestBlock | undefined {
  const path = memberPath(call.callee);
  if (path === undefined) {
    return undefined;
  }
  const name = path.join(".");
  const kind = KINDS.get(name);
  const callback = call.arguments.at(-1);
  if (kind === undefined || callback === undefined || !isFunctionNode(callback)) {
    return undefined;
  }
  const title = titleArgument(call);
  if (title === undefined && TITLED.has(kind)) {
    return undefined;
  }
  return {
    kind,
    name,
    runner: path[0] === PLAYWRIGHT_ROOT ? "playwright" : "mocha",
    modifiers: path.filter((part) => isOneOf(BLOCK_MODIFIERS, part)),
    node: call,
    title,
    callback,
  };
}
