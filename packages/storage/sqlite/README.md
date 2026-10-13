# @atium/storage-sqlite

Local storage backend for Atium: keeps the run history in a SQLite database
inside the repository, at `.atium/atium.db`. It is the default backend for
local development; it does not persist between CI jobs.

> Atium is a provisional codename and this package is not published to npm yet.

It provides `openSqliteStorage` with `OpenSqliteStorageOptions`, and
`SQLITE_DATABASE_PATH`. The storage implements the `Storage` interface of
`@atium/core` and passes its contract suite.

## Installation

Not published yet. Inside this repository, add it as a workspace dependency:

```json
{
  "dependencies": {
    "@atium/storage-sqlite": "workspace:*"
  }
}
```

Requires Node.js 22 or later. It depends on `better-sqlite3`, a native addon
that ships prebuilt binaries for Linux, macOS and Windows on x64 and arm64.
On other platforms the addon has to be compiled with node-gyp, which needs
Python and a C++ toolchain. The package ships both ESM and CommonJS builds
with type declarations.

## Usage

```ts
import { openSqliteStorage } from "@atium/storage-sqlite";

const opened = await openSqliteStorage({ rootDir: repoRoot, logger });
if (!opened.ok) {
  logger.warn("History not available", { error: opened.error });
  return;
}
const storage = opened.value;
try {
  await storage.writeRun(run);
  const recent = await storage.listRuns({ branch: "main", limit: 50 });
} finally {
  await storage.close();
}
```

`openSqliteStorage` creates the database and its directory when they do not
exist and applies the pending migrations. A new database file is readable
only by its owner, and a new directory only listable by its owner. It returns
`STORAGE_UNAVAILABLE` if the database cannot be created, opened or migrated,
and `MODEL_INVALID` if `path` leads outside `rootDir`, directly or through a
symlink, or if the database file is a symlink.

The storage stores texts as they come: redact error messages, stacks and
network data before `writeRun`.

Besides the results of every `Storage`:

- `writeRun` validates the run with `RunSchema` and returns `MODEL_INVALID`,
  storing nothing, if it does not match or if it repeats a `testId`, or an
  attempt `index` within a result.
- `getRun` and `listRuns` return `MODEL_INVALID` for a stored run that no
  longer matches `RunSchema`, such as after editing the database by hand.

The database uses WAL mode and stores each run in one transaction; if the file
system does not support WAL, it logs a warning and works without it. `close`
never throws: a failure to close is logged as a warning. Writing a run of
1,000 tests takes well under a second.

## Configuration

| Option | Default | Meaning |
|---|---|---|
| `rootDir` | (required) | Root of the repository. The database must stay inside it. |
| `path` | `.atium/atium.db` | Path of the database, relative to `rootDir` or absolute inside it. |
| `logger` | (required) | Receives the warnings that do not stop the storage. |

## Development

The tables are defined with Drizzle in `src/schema.ts`. After changing them,
generate the migration with `pnpm --filter @atium/storage-sqlite db:generate`
and commit the files it writes in `drizzle/`. Migrations are applied when the
database is opened. `pnpm --filter @atium/storage-sqlite bench` measures
writes of runs of 1,000 and 5,000 tests.

## Documentation

See [15-storage.md §23.6](../../../docs/design/15-storage.md#236-esquema-sqlite-local)
for the schema and its rules.
