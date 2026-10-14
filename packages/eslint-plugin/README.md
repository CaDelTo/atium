# @atium/eslint-plugin

ESLint plugin of Atium: per-file rules that catch problems in Playwright and
Cypress test suites, such as fixed waits or fragile selectors, in the editor
and in CI.

> Atium is a provisional codename and this package is not published to npm yet.
> It has no rules yet: they arrive with the next tasks of the V1 phase.

## Installation

Not published yet. Inside this repository, build it with:

```sh
pnpm --filter @atium/eslint-plugin build
```

Requires Node.js 22 or later and ESLint 9 with a flat config
(`eslint.config.*`). The legacy `.eslintrc` format is not supported.

## Usage

Register the plugin in `eslint.config.js` and turn on its rules by their
`atium/` name:

```js
import atium from "@atium/eslint-plugin";

export default [
  {
    plugins: { atium },
    rules: {
      // "atium/<rule-name>": "warn", one entry per rule (see docs/rules/)
    },
  },
];
```

From a CommonJS config, `require("@atium/eslint-plugin")` returns the same
object.

## Configuration

Options shared by several rules go in `settings.atium`:

```js
export default [
  {
    plugins: { atium },
    settings: {
      atium: {
        framework: "playwright",
        pageObjectDirs: ["tests/pages/**"],
        assertFunctionNames: ["expectToast", "verify*"],
        i18n: true,
      },
    },
  },
];
```

| Key                   | Default                    | Meaning                                                                       |
| --------------------- | -------------------------- | ----------------------------------------------------------------------------- |
| `framework`           | detected from each file's imports | `"playwright"` or `"cypress"`                                         |
| `pageObjectDirs`      | `[]`                       | Globs of the Page Object code, where selectors are allowed                    |
| `assertFunctionNames` | `[]`                       | Helpers that count as an assertion, by function or method name; `*` is the only wildcard, as in `verify*` |
| `i18n`                | `false`                    | Penalize selectors by visible text, because they change with the language    |

Without `framework`, a file counts as Playwright when it imports
`@playwright/test` or `playwright/test`, and as Cypress when it imports
`cypress`; subpaths such as `cypress/react` count too. A file that imports
neither, or both, has no framework. Cypress specs usually import nothing, and
Playwright specs often import `test` from a fixtures file, so set `framework`
for rules that depend on it.

When an Atium rule runs, an unknown key or a value of the wrong type stops
ESLint with a `CONFIG_INVALID` error that names the key, so a typo does not go
unnoticed.

## Internal entry: `@atium/eslint-plugin/syntax`

Pure helpers over the typescript-eslint AST that recognize the framework,
tests and their `titlePath`, actions, assertions, locators and fixed waits.
The rules, `@atium/suite-index` and the analyzers share them. This entry is
internal, not public API, and never loads ESLint. The recognized names are in
`src/defaults.ts` and in section 11.3.1 of the linter design.

## Documentation

Every rule has a page in [`docs/rules/`](../../docs/rules/), linked from the
`meta.docs.url` of the rule. See the
[linter design](../../docs/design/03-linter.md) for the full picture.
