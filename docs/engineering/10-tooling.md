# Herramientas que hacen cumplir los estándares

Configuración inicial; se ajusta al crear el repositorio en V0.

## Resumen

| Regla | Herramienta |
|---|---|
| Formato | Prettier |
| Tipos estrictos | `tsconfig.base.json` ([01-typescript.md](01-typescript.md)) |
| Reglas de código | ESLint + typescript-eslint (`strictTypeChecked`, `stylisticTypeChecked`) |
| Capas y ciclos | dependency-cruiser |
| Código, exports y dependencias sin usar | knip |
| Código duplicado | jscpd |
| Code smells (complejidad cognitiva, funciones idénticas, ramas duplicadas) | eslint-plugin-sonarjs |
| Paquetes publicables | publint, @arethetypeswrong/cli |
| Commits | commitlint + `@commitlint/config-conventional` |
| Hooks locales | lefthook |
| Tests y cobertura | Vitest (`@vitest/coverage-v8`) |
| Property-based | fast-check |
| Mutation testing | Stryker (nocturno) |
| Dependencias | Renovate, `pnpm audit` |

## Scripts de la raíz

```json
{
  "scripts": {
    "build": "turbo run build",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "lint": "eslint .",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "test:coverage": "turbo run test -- --coverage",
    "deps:check": "depcruise packages --config .dependency-cruiser.cjs",
    "unused": "knip",
    "dupes": "jscpd packages",
    "pkg:check": "turbo run pkg:check",
    "bench": "turbo run bench",
    "verify": "pnpm format:check && pnpm lint && pnpm typecheck && pnpm deps:check && pnpm unused && pnpm dupes && pnpm test"
  }
}
```

En cada paquete publicable: `"pkg:check": "publint && attw --pack ."`. Se ejecuta en CI antes de publicar.

En cada paquete con carpeta `bench/`: `"bench": "vitest bench --run"`. Los benchmarks no forman parte de `pnpm verify` (son lentos); los ejecuta `perf-benchmarker` y el CI de rendimiento.

## ESLint (código del proyecto)

```js
// eslint.config.js
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
import sonarjs from "eslint-plugin-sonarjs";

export default tseslint.config(
  { ignores: ["**/dist/**", "**/coverage/**", "fixtures/**"] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  sonarjs.configs.recommended,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
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
        { patterns: [{ group: ["@atium/*/src/*"], message: "Import from the package entry point." }] },
      ],
    },
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
    files: ["*.config.{js,ts,mjs}", "**/*.config.{js,ts,mjs}"],
    rules: { "no-restricted-syntax": "off" },
  },
  {
    files: ["packages/cli/src/output/**"],
    rules: { "no-console": "off" },
  },
  prettier,
);
```

## Prettier

```json
{
  "printWidth": 100,
  "singleQuote": false,
  "trailingComma": "all",
  "semi": true
}
```

## dependency-cruiser

Reglas que reflejan la tabla de capas de [02-code-design.md](02-code-design.md):

```js
// .dependency-cruiser.cjs
module.exports = {
  forbidden: [
    { name: "no-circular", severity: "error", from: {}, to: { circular: true } },
    {
      name: "core-is-independent",
      severity: "error",
      from: { path: "^packages/core/" },
      to: { path: "^packages/(?!core/)" },
    },
    {
      name: "analyzers-are-isolated",
      severity: "error",
      from: { path: "^packages/analyzers/([^/]+)/" },
      to: { path: "^packages/analyzers/", pathNot: "^packages/analyzers/$1/" },
    },
    {
      name: "analyzers-no-io-packages",
      severity: "error",
      from: { path: "^packages/analyzers/" },
      to: { path: "^packages/(adapters|storage|reporters|cli)/" },
    },
    {
      name: "adapters-no-analyzers",
      severity: "error",
      from: { path: "^packages/adapters/" },
      to: { path: "^packages/(analyzers|storage|cli)/" },
    },
    {
      name: "no-test-code-in-src",
      severity: "error",
      from: { path: "^packages/[^/]+/src/", pathNot: "\\.test\\.ts$" },
      to: { path: "\\.test\\.ts$" },
    },
  ],
  options: {
    tsConfig: { fileName: "tsconfig.base.json" },
    doNotFollow: { path: "node_modules" },
  },
};
```

## jscpd

Archivo `.jscpd.json` (la carpeta `reports/` va en `.gitignore`):

```json
{
  "threshold": 3,
  "minLines": 6,
  "minTokens": 60,
  "format": ["typescript", "javascript"],
  "reporters": ["console", "json"],
  "output": "reports/jscpd",
  "gitignore": true,
  "ignore": [
    "**/dist/**",
    "**/coverage/**",
    "**/*.test.ts",
    "**/test/**",
    "fixtures/**",
    "examples/**"
  ]
}
```

- `threshold: 3` hace fallar `pnpm verify` si más del 3% del código de `packages/` está duplicado.
- Los bloques duplicados individuales se revisan en `/review` con `duplication-auditor`, que distingue conocimiento duplicado (se unifica) de similitud accidental (puede quedarse).
- Los tests se excluyen del umbral: un poco de repetición en tests mejora la legibilidad. La duplicación de datos de prueba se resuelve con builders.

## commitlint

```js
// commitlint.config.js
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "scope-enum": [2, "always", [
      "core", "cli", "eslint-plugin", "suite-index",
      "playwright", "cypress", "junit", "ctrf", "bdd",
      "flaky", "triage", "selectors", "network", "chaos", "gaps", "impact", "lint-crossfile",
      "storage-sqlite", "storage-s3", "storage-git",
      "reporter-console", "reporter-json", "reporter-sarif", "reporter-junit", "reporter-html",
      "action", "docs", "design", "adr", "deps", "repo",
    ]],
  },
};
```

## lefthook

```yaml
# lefthook.yml
pre-commit:
  parallel: true
  commands:
    format:
      glob: "*.{ts,js,json,md,yml}"
      run: pnpm prettier --check {staged_files}
    lint:
      glob: "*.{ts,js}"
      run: pnpm eslint {staged_files}
commit-msg:
  commands:
    commitlint:
      run: pnpm commitlint --edit {1}
pre-push:
  commands:
    typecheck:
      run: pnpm typecheck
```

## Vitest

```ts
// packages/core/vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    sequence: { shuffle: true },
    coverage: {
      provider: "v8",
      thresholds: { lines: 90, branches: 90, functions: 90, statements: 90 },
    },
  },
});
```

Los umbrales por paquete siguen [04-testing.md](04-testing.md#cobertura-y-mutation-testing).

## Renovate

```json
{
  "extends": ["config:recommended"],
  "minimumReleaseAge": "14 days",
  "schedule": ["before 6am on monday"],
  "packageRules": [
    { "matchUpdateTypes": ["minor", "patch"], "groupName": "non-major dependencies" }
  ]
}
```
