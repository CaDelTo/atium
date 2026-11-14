import type { TSESTree } from "@typescript-eslint/types";
import { parse, simpleTraverse } from "@typescript-eslint/typescript-estree";

/**
 * Parses TypeScript like typescript-eslint does for ESLint and sets the
 * `parent` of every node, which `extractFileIndex` needs.
 *
 * @param code - The source of a file.
 * @returns The AST.
 */
export function parseSource(code: string): TSESTree.Program {
  const program = parse(code, { loc: true, range: true });
  simpleTraverse(program, { enter: () => undefined }, true);
  return program;
}

/**
 * Builds the source of a Playwright spec: the import of `test` and `expect`
 * from `@playwright/test` followed by the given lines.
 *
 * @param lines - The body of the file, one entry per line.
 * @returns The source.
 */
export function playwrightSpec(...lines: readonly string[]): string {
  return ['import { test, expect } from "@playwright/test";', ...lines].join("\n");
}
