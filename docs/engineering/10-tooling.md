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
| CI | GitHub Actions (`.github/workflows/verify.yml`) |

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
    "deps:check": "turbo run build && depcruise packages --config .dependency-cruiser.cjs",
    "unused": "knip",
    "dupes": "jscpd packages",
    "pkg:check": "turbo run pkg:check",
    "bench": "turbo run bench",
    "verify": "pnpm format:check && pnpm lint && pnpm typecheck && pnpm deps:check && pnpm unused && pnpm dupes && pnpm test"
  }
}
```

En cada paquete publicable: `"pkg:check": "publint && attw --pack . --profile node16"`. Se ejecuta en CI antes de publicar. El perfil `node16` omite la resolución `node10`, que no aplica con Node ≥ 22 y no resuelve subpaths como `./testing`.

En cada paquete con carpeta `bench/`: `"bench": "vitest bench --run"`. Los benchmarks no forman parte de `pnpm verify` (son lentos); los ejecuta `perf-benchmarker` y el CI de rendimiento. En Vitest 5, `bench` es parte del contexto del test (`test("…", async ({ bench }) => { await bench("…", fn).run(); })`) y no hay `--outputJson` ni `--compare`: los resultados se exportan con `--reporter=json --outputFile=<archivo>`.

## ESLint (código del proyecto)

Además de las reglas comunes:

- Los archivos `.js`, `.cjs` y `.mjs` no tienen información de tipos (`disableTypeChecked`): son configs de la raíz que no pertenecen a ningún tsconfig. Los `*.config.ts` de la raíz usan el proyecto por defecto (`allowDefaultProject`).
- `.claude/` se ignora: es configuración del agente, no código del producto.

```js
// eslint.config.js
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
import sonarjs from "eslint-plugin-sonarjs";

export default tseslint.config(
  { ignores: ["**/dist/**", "**/coverage/**", "fixtures/**", ".claude/**"] },
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

`.prettierignore` excluye `dist`, `coverage`, `fixtures`, `reports`, `pnpm-lock.yaml`, `**/*.md` (Prettier realinea las tablas y reescribe los ejemplos de código de los documentos) y `.claude` (los hooks no son editables por el agente).

Finales de línea: `lf` en todos los archivos (default de Prettier y `end_of_line = lf` en `.editorconfig`). `.gitattributes` fuerza `eol=lf` al hacer checkout para que `prettier --check` pase en Windows, salvo en `fixtures/`, cuyos archivos son salidas reales de frameworks y se guardan byte a byte.

## dependency-cruiser

Reglas que reflejan la tabla de capas de [02-code-design.md](02-code-design.md).

- `enhancedResolveOptions` resuelve los imports entre paquetes por sus `exports`, igual que Node, es decir, hacia el `dist/` del paquete. Por eso `deps:check` construye primero, y `dist/` está en `doNotFollow` (entra al grafo como destino, no se recorre) y no en `exclude`.
- `not-to-unresolvable` hace fallar un import que no resuelve (por ejemplo, sin `dist/`); sin ella, ese import pasaría por encima de todas las reglas de capas.
- dependency-cruiser rechaza expresiones con cuantificadores anidados, por eso `no-test-code-in-src` enumera las carpetas con paquetes anidados.

```js
// .dependency-cruiser.cjs
/** @type {import("dependency-cruiser").IConfiguration} */
module.exports = {
  forbidden: [
    { name: "no-circular", severity: "error", from: {}, to: { circular: true } },
    {
      // An unresolved import would slip past every layer rule, so it fails on its own.
      name: "not-to-unresolvable",
      severity: "error",
      from: {},
      to: { couldNotResolve: true },
    },
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
      // Covers packages/<name>/src and nested ones such as packages/analyzers/<name>/src.
      from: {
        path: "^packages/([^/]+|(adapters|analyzers|storage|reporters)/[^/]+)/src/",
        pathNot: "\\.test\\.ts$",
      },
      to: { path: "\\.test\\.ts$" },
    },
  ],
  options: {
    tsConfig: { fileName: "tsconfig.base.json" },
    // Workspace packages resolve to their built `dist/` through `exports`: keep those
    // files in the graph as targets so the layer rules see them, but do not cruise them.
    doNotFollow: { path: ["node_modules", "(^|/)dist/"] },
    exclude: { path: "(^|/)(coverage|node_modules)/" },
    // Resolve workspace packages through their `exports` like Node does.
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
      mainFields: ["module", "main", "types", "typings"],
    },
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

## knip

`knip.json` en la raíz. knip detecta los workspaces desde `pnpm-workspace.yaml` y los plugins (Vitest, tsup, ESLint, etc.) desde cada `package.json`:

```json
{
  "$schema": "https://unpkg.com/knip@6/schema.json",
  "ignore": [".claude/**"]
}
```

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
      glob: "*.{ts,js,cjs,mjs,json,md,yml}"
      run: pnpm prettier --check {staged_files}
    lint:
      glob: "*.{ts,js,cjs,mjs}"
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
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts"],
      thresholds: { lines: 90, branches: 90, functions: 90, statements: 90 },
    },
  },
});
```

Los umbrales por paquete siguen [04-testing.md](04-testing.md#cobertura-y-mutation-testing).

El `vitest.config.ts` de la raíz solo agrupa los proyectos, para ejecutar todos los tests desde la raíz o el editor. `pnpm test` los sigue ejecutando por paquete con Turborepo:

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: ["packages/*/vitest.config.ts", "packages/*/*/vitest.config.ts"],
  },
});
```

## Renovate

```json
{
  "extends": ["config:recommended"],
  "minimumReleaseAge": "14 days",
  "schedule": ["before 6am on monday"],
  "packageRules": [
    { "matchUpdateTypes": ["minor", "patch"], "groupName": "non-major dependencies" },
    {
      "description": "Stay on TypeScript 6 until the toolchain supports TypeScript 7 (ADR-0021).",
      "matchPackageNames": ["typescript"],
      "allowedVersions": "<7"
    }
  ]
}
```

Vive en `renovate.json`. La regla de `typescript` fija la serie 6 ([ADR-0021](../adr/0021-typescript-6.md)). `config:recommended` también actualiza las Actions fijadas por SHA y su comentario de versión.

## CI

`.github/workflows/verify.yml` se ejecuta en cada PR y en cada push a `main`:

- Job `verify`: `pnpm install --frozen-lockfile` y `pnpm verify` en Node 22 y 24 × Linux, macOS y Windows ([21-testing-strategy.md](../design/21-testing-strategy.md) §29; la dimensión de versiones de Playwright llega con los adapters).
- Job `audit`: `pnpm audit --audit-level high` ([06-security.md](06-security.md)).
- `permissions: contents: read`, Actions fijadas por SHA, `concurrency` que cancela ejecuciones obsoletas del mismo PR (nunca las de `main`) y `timeout-minutes: 30` por job.
