# @atium/cli

Command line interface of Atium: the `atium` binary.

> Atium is a provisional codename and this package is not published to npm yet.

## Installation

Not published yet. Inside this repository, build it and run the binary:

```sh
pnpm --filter @atium/cli build
node packages/cli/dist/bin.js --help
```

Requires Node.js 22.12 or later. The package has no programmatic API: only
the `atium` binary, as an ES module.

## Usage

```sh
atium init            # create atium.config.ts and detect Playwright or Cypress
atium init --force    # replace an existing atium.config.ts
```

`atium init` reads the `package.json` of the working directory (a regular
file of at most 1 MiB) and adds the `playwright` adapter for
`@playwright/test` or `playwright`, and the `cypress` adapter for `cypress`.
The config imports `defineConfig` from `@atium/core`, so the project needs it
as a dependency:

```ts
import { defineConfig } from "@atium/core";

export default defineConfig({
  adapters: ["playwright"],
});
```

It exits with code 2, and changes nothing, if `atium.config.ts` already
exists without `--force`, if another `atium.config.*` exists (even with
`--force`, since two config files are ambiguous), if `atium.config.ts` is a
directory, or with `--config`: it always creates the file in the working
directory. `--force` replaces the file atomically, so a failed write keeps the
old one.

Global options, accepted before or after the command name:

| Option | Effect |
|---|---|
| `--config <path>` | Config file to use instead of the `atium.config.*` of the working directory |
| `--format <format>` | Format of the results; each command lists the ones it supports |
| `--output <path>` | File to write the results to instead of stdout |
| `--ci` | Run as in CI |
| `--strict` | Exit with code 3 on internal errors instead of 0 |
| `--quiet` | Log only errors |
| `--verbose` | Log debug messages and error stacks |

Results go to stdout and logs to stderr, so the output can be redirected.

## Exit codes

| Code | Meaning |
|---|---|
| 0 | OK, or an internal error without `--strict` (logged as an error) |
| 1 | Gate failed (`atium gate`, in a later phase; no command returns it yet) |
| 2 | Configuration or usage error |
| 3 | Internal error, with `--strict` |

An internal error never blocks the pipeline unless `--strict` is given
(fail-open), even when the error cannot be reported. `atium` without a command
prints the help to stderr and exits with 2. Error messages are redacted and
their control characters escaped before they reach the terminal. See the design, 18-cli-config.md §26, for the details.
