# @atium/suite-index

Cross-file index of a Playwright or Cypress test suite. `atium lint` builds
it to run the cross-file rules (E2E006b, E2E007, E2E008, E2E011 and E2E013),
which ESLint cannot check one file at a time.

> Atium is a provisional codename and this package is not published to npm yet.
> It is internal: only Atium's own packages use it.

It provides `extractFileIndex`, which extracts the `FileIndex` of one file,
and `FileIndexSchema` with `FILE_INDEX_SCHEMA_VERSION`. Building the index of
a whole suite, resolving references between files and the cache arrive with
the next tasks of the V1 phase.

## Installation

Not published yet. Inside this repository, add it as a workspace dependency:

```json
{
  "dependencies": {
    "@atium/suite-index": "workspace:*"
  }
}
```

Requires Node.js 22 or later. It depends on `@atium/eslint-plugin`, of which
it loads only the `syntax` entry, which never loads ESLint; your package
manager may still warn about the plugin's ESLint peer dependency.

## Usage

```ts
import { extractFileIndex } from "@atium/suite-index";

// `program` is the AST of the file from the parser of typescript-eslint,
// with the `parent` of every node set, as ESLint leaves it.
const index = extractFileIndex(program, source, {
  assertFunctionNames: ["verify*"],
  i18n: false,
});
for (const test of index.tests) {
  console.log(test.fullTitle, test.actions.length, test.assertions.length);
}
```

`extractFileIndex` is pure: it does not change the AST, never throws and
gives the same index for the same source and options.

## Configuration

| Option | Default | Meaning |
|---|---|---|
| `framework` | detected from the imports | `settings.atium.framework` of the file. |
| `assertFunctionNames` | (required) | `settings.atium.assertFunctionNames`: helpers that count as an assertion. |
| `i18n` | (required) | `settings.atium.i18n`: whether selectors by visible text drop a level. |

## Documentation

See [03-linter.md §11.4](../../docs/design/03-linter.md#114-reglas-cross-file)
for the shape of the index.
