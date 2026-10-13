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
atium doctor          # check that Atium can run in this project
atium doctor --format json
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

`atium doctor` runs six checks and prints a table, or a JSON object with
`--format json`, to stdout:

| Check | Fails when | Warns when |
|---|---|---|
| `node` | Node.js is older than 22.12.0 | — |
| `config` | the config cannot be loaded or is invalid | there is no config file |
| `git` | Git is missing or this is not a repository with a commit, and the commit must come from Git | the same, but the commit comes from `ATIUM_COMMIT_SHA` or the CI provider |
| `ci` | the commit must come from Git and Git cannot give it, or a CI variable holds a value a run cannot store | — |
| `storage` | `.atium/` (or, if it does not exist yet, the working directory) cannot be written, or `.atium` is a symlink that is broken or leads outside the working directory | — |
| `frameworks` | — | `package.json` has no Playwright or Cypress dependency, or cannot be read |

Like every command, it loads the config, so it runs the project's
`atium.config.*`. `.atium/` is looked for in the working directory, the root
of the project for the CLI. Every check that does not pass comes with a hint,
and every text of the output, JSON included, is redacted. It exits with code 2 if any
check fails and 0 otherwise; warnings do not change the exit code. The JSON
output is not a stable API yet.

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
| 2 | Configuration or usage error, or a failed check of `atium doctor` |
| 3 | Internal error, with `--strict` |

An internal error never blocks the pipeline unless `--strict` is given
(fail-open), even when the error cannot be reported. `atium` without a command
prints the help to stderr and exits with 2. Error messages are redacted and
their control characters escaped before they reach the terminal. See the design, 18-cli-config.md §26, for the details.
