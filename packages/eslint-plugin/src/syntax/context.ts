import { TITLE_PATH_SEPARATOR } from "@atium/core/pure";
import { AST_NODE_TYPES } from "@typescript-eslint/types";
import type { TSESTree } from "@typescript-eslint/types";
import { isFunctionNode } from "./ast.js";
import type { TestBlock } from "./structure.js";
import { classifyBlock } from "./structure.js";
import type { Title } from "./title.js";
import { titleOf } from "./title.js";

/**
 * The `titlePath` of a test or describe: the titles of the describes that
 * contain it and its own (02-data-model.md §9.3).
 */
export interface TitlePath {
  /** The titles, outermost first. Steps, hooks and describes without title add no level. */
  readonly titles: readonly string[];
  /** The titles joined with `" › "`, as in the `testId` (02-data-model.md §9.3). */
  readonly fullTitle: string;
  /** Whether every title is static; see {@link titleOf}. */
  readonly isStatic: boolean;
}

/** The test that contains a node, and its `titlePath`. */
export interface TestContext extends TitlePath {
  /** The test. */
  readonly test: TestBlock;
}

/**
 * The tests, describes, hooks and steps whose body contains a node. The
 * declaring call itself does not contain its title or its own node.
 *
 * Needs the `parent` of each node, which ESLint sets; a test that parses with
 * typescript-estree sets it with `simpleTraverse(ast, options, true)`.
 *
 * @param node - Any node.
 * @returns The blocks, outermost first.
 */
export function enclosingBlocks(node: TSESTree.Node): readonly TestBlock[] {
  const blocks: TestBlock[] = [];
  let current: TSESTree.Node = node;
  while (current.parent !== undefined) {
    const { parent } = current;
    if (parent.type === AST_NODE_TYPES.CallExpression && isFunctionNode(current)) {
      const block = classifyBlock(parent);
      if (block?.callback === current) {
        blocks.push(block);
      }
    }
    current = parent;
  }
  return blocks.reverse();
}

/**
 * The title that a block adds to the `titlePath`, as the runner builds it:
 * tests and describes add one, steps and hooks none. A describe without title
 * adds none either, and neither does a Playwright describe titled `""`, which
 * Playwright drops from its `titlePath`; Mocha keeps `""` (03-linter.md §11.3.1).
 */
function levelOf(block: TestBlock): Title | undefined {
  if ((block.kind !== "describe" && block.kind !== "test") || block.title === undefined) {
    return undefined;
  }
  const title = titleOf(block.title);
  const dropped =
    block.kind === "describe" &&
    block.runner === "playwright" &&
    title.isStatic &&
    title.text === "";
  return dropped ? undefined : title;
}

/** The `titlePath` of the last block of a list of nested blocks. */
function titlePathOfNested(blocks: readonly TestBlock[]): TitlePath {
  const titles = blocks.flatMap((block) => levelOf(block) ?? []);
  const texts = titles.map((title) => title.text);
  return {
    titles: texts,
    fullTitle: texts.join(TITLE_PATH_SEPARATOR),
    isStatic: titles.every((title) => title.isStatic),
  };
}

/**
 * The `titlePath` of a block: the titles of the enclosing describes and
 * tests, and its own when it is a test or a describe.
 *
 * @param block - Any block. For a hook, the result is the path of the
 * describes that contain it; for a step, the path of its test.
 * @returns The `titlePath`.
 */
export function titlePathOf(block: TestBlock): TitlePath {
  return titlePathOfNested([...enclosingBlocks(block.node), block]);
}

/**
 * The test that contains a node, such as an action or an assertion, and the
 * `titlePath` of that test. Nodes inside a `test.step` belong to the test
 * that contains the step.
 *
 * @param node - Any node.
 * @returns The context, or `undefined` when the node is outside every test,
 * for example in a hook, a helper or a Page Object.
 */
export function testContextOf(node: TSESTree.Node): TestContext | undefined {
  const blocks = enclosingBlocks(node);
  const index = blocks.findLastIndex((block) => block.kind === "test");
  const test = blocks[index];
  if (test === undefined) {
    return undefined;
  }
  return { test, ...titlePathOfNested(blocks.slice(0, index + 1)) };
}
