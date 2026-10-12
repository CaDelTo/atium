# @atium/core

Shared foundation for Atium. Every other Atium package builds on it.

> Atium is a provisional codename and this package is not published to npm yet.

Today it provides `assertNever`, the error types (`AtiumError`, `ERROR_CODES`,
`ErrorCode`, `isAtiumError`), `Result` with `ok` and `err`, the `Logger`
interface with `LogLevel` and `LogContext`, and the `failOpen` helper with its
`FailOpenOptions`. The data model, configuration, CI detection, the analysis
pipeline, findings, fingerprinting and storage interfaces are planned.

## Installation

Not published yet. Inside this repository, add it as a workspace dependency:

```json
{
  "dependencies": {
    "@atium/core": "workspace:*"
  }
}
```

Requires Node.js 22 or later. The package ships both ESM and CommonJS builds
with type declarations.

## Usage

```ts
import { assertNever } from "@atium/core";

type State = { kind: "stable" } | { kind: "flaky" };

function label(state: State): string {
  switch (state.kind) {
    case "stable": return "Stable";
    case "flaky": return "Flaky";
    default: return assertNever(state);
  }
}
```

Expected failures throw an `AtiumError`, or return a `Result` when the caller
must decide what to do:

```ts
import { AtiumError, err, ok } from "@atium/core";
import type { Result } from "@atium/core";

function parsePort(text: string): Result<number> {
  const port = Number(text);
  return Number.isInteger(port) && port > 0
    ? ok(port)
    : err(new AtiumError("CONFIG_INVALID", `"${text}" is not a valid port.`, {
        hint: "Use a positive integer.",
      }));
}
```

To recognize one in a `catch`, use `isAtiumError` rather than `instanceof`,
which fails when both the ESM and the CommonJS build are loaded:

```ts
import { isAtiumError } from "@atium/core";

try {
  config = await loadConfig(cwd);
} catch (error) {
  if (!isAtiumError(error) || error.code !== "CONFIG_NOT_FOUND") {
    throw error;
  }
  config = DEFAULT_CONFIG;
}
```

At fail-open boundaries (reporter hooks, fixture, upload/sync, analyzers and
report writing), `failOpen` logs a warning and returns a fallback instead of
propagating the error:

```ts
import { failOpen } from "@atium/core";

const history = await failOpen(
  { label: "history sync", fallback: EMPTY_HISTORY, logger },
  () => storage.sync({ signal }),
);
```

The `@atium/core/testing` entry point holds test builders and fakes for
Atium's own tests. Today it provides `FakeLogger`, a `Logger` that records
every call.

## Configuration

This package has no configuration of its own yet.

## Documentation

See the [design documents](../../docs/design/README.md) for the full picture.
