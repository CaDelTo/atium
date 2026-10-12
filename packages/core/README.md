# @atium/core

Shared foundation for Atium. Every other Atium package builds on it.

> Atium is a provisional codename and this package is not published to npm yet.

Today it provides `assertNever`, the error types (`AtiumError`, `ERROR_CODES`,
`ErrorCode`, `isAtiumError`), `Result` with `ok` and `err`, the `Logger`
interface with `LogLevel` and `LogContext`, and the `failOpen` helper with its
`FailOpenOptions`. It also defines the data model: Zod schemas for `Run`,
`TestResult`, `TestCase`, `Attempt`, `ErrorOccurrence`, `NetworkSummary`,
`NetworkCall` and `BddContext`, the branded IDs `RunId`, `TestId` and
`Fingerprint`, and `truncateUtf8`. Configuration, CI detection, the analysis
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

Data that comes from outside, such as a framework report or a run file, is
validated with the model schemas. Types are derived from them, and parsed
objects are frozen:

```ts
import { AtiumError, RunSchema } from "@atium/core";
import type { Run } from "@atium/core";

const parsed = RunSchema.safeParse(JSON.parse(text));
if (!parsed.success) {
  throw new AtiumError("MODEL_INVALID", `Run file ${path} is invalid: ${parsed.error.message}`);
}
const run: Run = parsed.data;
```

Text fields have caps measured in UTF-8 bytes of the value once escaped for
JSON (ADR-0018), so a producer truncates with `truncateUtf8` before validating:

```ts
import { truncateUtf8 } from "@atium/core";

const message = truncateUtf8(rawMessage, 2048);
```

The JSON Schema of a run is published in `schemas/run.v1.json`. After changing
the model, regenerate it with `pnpm --filter @atium/core schema:export`.

The `@atium/core/testing` entry point holds test builders and fakes for
Atium's own tests:

- `aRun`, `aTestResult`, `aTestCase`, `anAttempt` and `anError`: immutable
  builders of the data model. Every method returns a new builder, and
  `build()` validates the result with its Zod schema and returns it frozen.
  Defaults are deterministic: a fixed start time, a run id derived from a seed
  (`withSeed`) and test ids and fingerprints derived from the content.
- `FakeLogger`: a `Logger` that records every call.

```ts
import { aRun, aTestResult } from "@atium/core/testing";

const run = aRun()
  .onCommit("abc123")
  .withResult(aTestResult("checkout").failedThenPassed())
  .build();
```

## Configuration

This package has no configuration of its own yet.

## Documentation

See the [design documents](../../docs/design/README.md) for the full picture.
