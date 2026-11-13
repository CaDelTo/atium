/* eslint-disable @typescript-eslint/no-unused-vars -- stub until the implementation */
import type { Framework } from "@atium/eslint-plugin/syntax";
import type { TSESTree } from "@typescript-eslint/types";
import type { FileIndex } from "./file-index.js";

/** The `settings.atium` of the file that change its index (03-linter.md §11.1). */
export interface ExtractFileIndexOptions {
  /** `settings.atium.framework`; when absent, it is detected from the imports. */
  readonly framework?: Framework | undefined;
  /** `settings.atium.assertFunctionNames`: helpers that count as an assertion. */
  readonly assertFunctionNames: readonly string[];
  /** `settings.atium.i18n`: whether selectors by visible text drop a level. */
  readonly i18n: boolean;
}

/**
 * Extracts the index of one file (03-linter.md §11.4). Pure: it reads the AST
 * without changing it, never throws and gives the same index for the same
 * source and options.
 *
 * @param program - The AST of the file, from the parser of typescript-eslint,
 * with the `parent` of every node set, as ESLint leaves it.
 * @param source - The source text the AST was parsed from.
 * @param options - The settings of the file.
 * @returns The index of the file.
 */
export function extractFileIndex(
  program: TSESTree.Program,
  source: string,
  options: ExtractFileIndexOptions,
): FileIndex {
  throw new Error("not implemented");
}
