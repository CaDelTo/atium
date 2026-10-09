# @atium/core

Shared foundation for Atium. Every other Atium package builds on it.

> Atium is a provisional codename and this package is not published to npm yet.

Today it provides `assertNever`. The data model, configuration, CI detection,
the analysis pipeline, findings, fingerprinting and storage interfaces are
planned.

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

The `@atium/core/testing` entry point is reserved for test builders and fakes.
It exports nothing yet.

## Configuration

This package has no configuration of its own yet.

## Documentation

See the [design documents](../../docs/design/README.md) for the full picture.
