import type { TSESTree } from "@typescript-eslint/types";
import { AST_NODE_TYPES } from "@typescript-eslint/types";
import { parse, simpleTraverse } from "@typescript-eslint/typescript-estree";

/** A parsed source and lookups of its nodes by their exact source text. */
export interface ParsedSource {
  /** The AST, with `parent` set on every node as ESLint does. */
  readonly program: TSESTree.Program;
  /**
   * The call whose source text is exactly `text`.
   *
   * @throws Error when there is none.
   */
  call(text: string): TSESTree.CallExpression;
  /**
   * The `new` expression whose source text is exactly `text`.
   *
   * @throws Error when there is none.
   */
  newExpression(text: string): TSESTree.NewExpression;
  /**
   * The first node of any type whose source text is exactly `text`.
   *
   * @throws Error when there is none.
   */
  node(text: string): TSESTree.Node;
  /** Every call, in source order. */
  readonly calls: readonly TSESTree.CallExpression[];
}

/**
 * Parses TypeScript like typescript-eslint does for a rule, and sets the
 * `parent` of every node, which the syntax helpers need.
 *
 * @param code - The source of a test file.
 * @returns The AST and lookups by source text.
 */
export function parseSource(code: string): ParsedSource {
  const program = parse(code, { loc: true, range: true });
  const nodes: TSESTree.Node[] = [];
  simpleTraverse(program, { enter: (node) => nodes.push(node) }, true);
  const textOf = (node: TSESTree.Node) => code.slice(node.range[0], node.range[1]);
  const find = <T extends TSESTree.Node>(
    text: string,
    kind: string,
    isKind: (node: TSESTree.Node) => node is T,
  ): T => {
    const found = nodes.filter(isKind).find((node) => textOf(node) === text);
    if (found === undefined) {
      throw new Error(`No ${kind} with the source text ${JSON.stringify(text)}`);
    }
    return found;
  };
  const isCall = (node: TSESTree.Node) => node.type === AST_NODE_TYPES.CallExpression;
  const isNew = (node: TSESTree.Node) => node.type === AST_NODE_TYPES.NewExpression;
  const isAny = (node: TSESTree.Node): node is TSESTree.Node =>
    node.type !== AST_NODE_TYPES.Program;
  return {
    program,
    call: (text) => find(text, "call", isCall),
    newExpression: (text) => find(text, "new expression", isNew),
    node: (text) => find(text, "node", isAny),
    calls: nodes.filter(isCall),
  };
}
