import { AST_NODE_TYPES } from "@typescript-eslint/types";
import type { TSESTree } from "@typescript-eslint/types";
import { isStringLiteral, unwrap } from "./ast.js";

/**
 * The title of a test or describe as written in the code (03-linter.md §11.3.1).
 *
 * - A string literal or a template without `${}` is static: `text` is its value.
 * - Any other expression is not static: `text` is rebuilt from the AST, such
 *   as `logs in as ${user.name}`, so it does not depend on the formatting.
 */
export interface Title {
  /** The title, or its rendering when it is not static. */
  readonly text: string;
  /** Whether the title is known without running the code. */
  readonly isStatic: boolean;
}

/** Placeholder for an expression that the rendering does not spell out. */
const UNRENDERED = "…";

function templateText(
  template: TSESTree.TemplateLiteral,
  render: (expression: TSESTree.Expression) => string,
): string {
  return template.quasis
    .map((quasi, index) => {
      const expression = template.expressions[index];
      const text = quasi.value.cooked ?? quasi.value.raw;
      return expression === undefined ? text : `${text}\${${render(expression)}}`;
    })
    .join("");
}

function literalCode(literal: TSESTree.Literal): string {
  if (typeof literal.value === "string") {
    return JSON.stringify(literal.value);
  }
  if ("regex" in literal || "bigint" in literal) {
    return literal.raw;
  }
  return String(literal.value);
}

/** Renders names, `this` and literals; `undefined` for any other node. */
function renderAtom(node: TSESTree.Node): string | undefined {
  if (node.type === AST_NODE_TYPES.Identifier) {
    return node.name;
  }
  if (node.type === AST_NODE_TYPES.PrivateIdentifier) {
    return `#${node.name}`;
  }
  if (node.type === AST_NODE_TYPES.ThisExpression) {
    return "this";
  }
  return node.type === AST_NODE_TYPES.Literal ? literalCode(node) : undefined;
}

function memberCode(member: TSESTree.MemberExpression): string {
  const access = member.optional ? "?." : "";
  const property = renderCode(member.property);
  return member.computed
    ? `${renderCode(member.object)}${access}[${property}]`
    : `${renderCode(member.object)}${access || "."}${property}`;
}

/** Renders calls, member accesses, templates and operators; `undefined` for any other node. */
function renderComposite(node: TSESTree.Node): string | undefined {
  if (node.type === AST_NODE_TYPES.MemberExpression) {
    return memberCode(node);
  }
  if (node.type === AST_NODE_TYPES.CallExpression) {
    const access = node.optional ? "?." : "";
    return `${renderCode(node.callee)}${access}(${node.arguments.map(renderCode).join(", ")})`;
  }
  if (node.type === AST_NODE_TYPES.TemplateLiteral) {
    return `\`${templateText(node, renderCode)}\``;
  }
  if (
    node.type === AST_NODE_TYPES.BinaryExpression ||
    node.type === AST_NODE_TYPES.LogicalExpression
  ) {
    return `${renderCode(node.left)} ${node.operator} ${renderCode(node.right)}`;
  }
  return node.type === AST_NODE_TYPES.SpreadElement ? `...${renderCode(node.argument)}` : undefined;
}

/**
 * Renders an expression as code, from the AST, so the result does not depend
 * on spaces, line breaks or quotes. TypeScript wrappers such as `x!` and
 * `x as T` are left out. Expressions outside the common cases of a title are
 * rendered as `…`.
 */
function renderCode(node: TSESTree.Node): string {
  const target = unwrap(node);
  return renderAtom(target) ?? renderComposite(target) ?? UNRENDERED;
}

/** Whether `+` on this node joins text: a string, a template or a sum that contains one. */
function isText(node: TSESTree.Node): boolean {
  return (
    isStringLiteral(node) ||
    node.type === AST_NODE_TYPES.TemplateLiteral ||
    (node.type === AST_NODE_TYPES.BinaryExpression &&
      node.operator === "+" &&
      (isText(node.left) || isText(node.right)))
  );
}

/**
 * Renders a title that is not static: strings as text, the rest as `${code}`.
 * A `+` joins text only when one side is text, as in JavaScript; `count + 1`
 * is a sum, so `"Item " + (count + 1)` gives `Item ${count + 1}`.
 */
function renderTitle(node: TSESTree.Node): string {
  if (isStringLiteral(node)) {
    return node.value;
  }
  if (node.type === AST_NODE_TYPES.TemplateLiteral) {
    return templateText(node, renderCode);
  }
  if (node.type === AST_NODE_TYPES.BinaryExpression && node.operator === "+" && isText(node)) {
    return `${renderTitle(node.left)}${renderTitle(node.right)}`;
  }
  return `\${${renderCode(node)}}`;
}

/**
 * Reads the title of a test or describe from its first argument.
 *
 * @param node - The title argument.
 * @returns The title and whether it is static.
 */
export function titleOf(node: TSESTree.Expression): Title {
  if (isStringLiteral(node)) {
    return { text: node.value, isStatic: true };
  }
  if (node.type === AST_NODE_TYPES.TemplateLiteral && node.expressions.length === 0) {
    return { text: templateText(node, renderCode), isStatic: true };
  }
  return { text: renderTitle(node), isStatic: false };
}
