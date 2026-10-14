import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
import sonarjs from "eslint-plugin-sonarjs";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/coverage/**",
      "fixtures/**",
      ".claude/**",
      // Demo repos have seeded problems; only their verify/ checks are repo code.
      "examples/*/*",
      "!examples/*/verify/",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  sonarjs.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        // Root TypeScript configs belong to no package tsconfig.
        projectService: {
          allowDefaultProject: ["*.config.ts"],
          defaultProject: "tsconfig.base.json",
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/explicit-module-boundary-types": "error",
      "@typescript-eslint/prefer-readonly": "error",
      "@typescript-eslint/no-unused-vars": ["error", { ignoreRestSiblings: true }],
      "no-console": "error",
      "no-eval": "error",
      "no-implied-eval": "error",
      "max-params": ["error", 3],
      complexity: ["warn", 10],
      "sonarjs/cognitive-complexity": ["warn", 15],
      "sonarjs/no-identical-functions": "error",
      "sonarjs/no-duplicated-branches": "error",
      "sonarjs/no-all-duplicated-branches": "error",
      "sonarjs/no-identical-conditions": "error",
      "sonarjs/no-collapsible-if": "error",
      "sonarjs/no-duplicate-string": ["warn", { threshold: 4 }],
      "max-lines": ["warn", { max: 400, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": ["warn", { max: 60, skipBlankLines: true, skipComments: true }],
      "no-restricted-syntax": [
        "error",
        { selector: "TSEnumDeclaration", message: "Use a union of literals instead of enum." },
        { selector: "ExportDefaultDeclaration", message: "Use named exports." },
      ],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@atium/*/src/*"], message: "Import from the package entry point." },
          ],
        },
      ],
    },
  },
  {
    // ADR-0023: `@atium/eslint-plugin/syntax` never loads ESLint at runtime, so
    // suite-index can use it. dependency-cruiser does not see npm packages.
    files: ["packages/eslint-plugin/src/syntax/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@atium/*/src/*"], message: "Import from the package entry point." },
            {
              group: [
                "eslint",
                "@typescript-eslint/utils",
                "@typescript-eslint/parser",
                "@typescript-eslint/typescript-estree",
              ],
              allowTypeImports: true,
              message: "syntax/ never loads ESLint (ADR-0023): use @typescript-eslint/types.",
            },
          ],
        },
      ],
    },
  },
  {
    // Root config files are not part of any tsconfig, so they get no type information.
    files: ["**/*.{js,cjs,mjs}"],
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    files: ["**/*.cjs"],
    languageOptions: { globals: { module: "writable", require: "readonly" } },
  },
  {
    files: ["**/*.test.ts", "**/test/**", "**/bench/**"],
    rules: {
      "max-lines-per-function": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "sonarjs/no-duplicate-string": "off",
    },
  },
  {
    // Benchmarks measure; they have nothing to assert.
    files: ["**/bench/**"],
    rules: { "sonarjs/assertions-in-tests": "off" },
  },
  {
    files: ["*.config.{js,ts,mjs}", "**/*.config.{js,ts,mjs}"],
    rules: { "no-restricted-syntax": "off" },
  },
  {
    files: ["packages/cli/src/output/**"],
    rules: { "no-console": "off" },
  },
  prettier,
);
