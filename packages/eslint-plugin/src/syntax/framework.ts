import { AST_NODE_TYPES } from "@typescript-eslint/types";
import type { TSESTree } from "@typescript-eslint/types";
import { FRAMEWORK_MODULES, FRAMEWORKS } from "../defaults.js";

export { FRAMEWORKS };

/** A framework the linter recognizes. */
export type Framework = (typeof FRAMEWORKS)[number];

function importsModule(specifier: string, modules: readonly string[]): boolean {
  return modules.some((module) => specifier === module || specifier.startsWith(`${module}/`));
}

/**
 * The framework of a file: the configured one, or else the one its imports
 * reveal (03-linter.md §11.1 and §11.3.1). Type-only imports count, so a Page
 * Object that imports `Page` from `@playwright/test` is Playwright code.
 *
 * @param program - The AST of the file.
 * @param configured - `settings.atium.framework`, when set.
 * @returns The framework, or `undefined` when nothing is configured and the
 * file imports neither framework nor both. Only `import`
 * declarations count, not `export … from`, `require()` or triple-slash references.
 */
export function detectFramework(
  program: TSESTree.Program,
  configured?: Framework,
): Framework | undefined {
  if (configured !== undefined) {
    return configured;
  }
  const found = new Set<Framework>();
  for (const statement of program.body) {
    if (statement.type !== AST_NODE_TYPES.ImportDeclaration) {
      continue;
    }
    for (const framework of FRAMEWORKS) {
      if (importsModule(statement.source.value, FRAMEWORK_MODULES[framework])) {
        found.add(framework);
      }
    }
  }
  const [only, ...others] = found;
  return others.length === 0 ? only : undefined;
}
