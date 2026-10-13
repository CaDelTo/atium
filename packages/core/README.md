# @atium/core

Shared foundation for Atium. Every other Atium package builds on it.

> Atium is a provisional codename and this package is not published to npm yet.

Today it provides `assertNever`, the error types (`AtiumError`, `ERROR_CODES`,
`ErrorCode`, `isAtiumError`), `Result` with `ok` and `err`, the `Logger`
interface with `LogLevel`, `LOG_LEVELS` and `LogContext`, the stderr logger
`createStderrLogger` with `StderrLoggerOptions` and `LogStream`, the `Clock`
interface with `systemClock`, and the `failOpen` helper with its
`FailOpenOptions`. It also defines the data model: Zod schemas for `Run`,
`TestResult`, `TestCase`, `Attempt`, `ErrorOccurrence`, `NetworkSummary`,
`NetworkCall` and `BddContext`, the branded IDs `RunId`, `TestId` and
`Fingerprint`, and `truncateUtf8`. Every analyzer reports a `Finding`
(`FindingSchema`, with `FINDING_SEVERITIES`, `FINDING_CATEGORIES`,
`FINDING_SOURCES` and `FINDING_CONFIDENCES`), identified by a
`FindingFingerprint` from `fingerprintOf` and ordered with `compareFindings`.
For redaction it provides `createRedactor` with its `Redactor` type,
`RedactConfigSchema` with `RedactConfig`, the pattern ids
`REDACT_PATTERN_IDS` with `RedactPatternId`, and `HeaderValue`.
For configuration it provides `defineConfig`, `loadConfig` with
`LoadConfigOptions`, `LoadedConfig`, `ConfigFlags` and `ConfigEnv`, and
`AtiumConfigSchema` with `AtiumConfig`, `AtiumConfigInput`,
`QUARANTINE_MODES` and `QuarantineMode`, and `CONFIG_FILE_NAMES`, the
config file names searched for.
For the Git and CI context of a run it provides `detectRunContext` with
`DetectRunContextOptions`, `RunContext` and `EnvVars` (the type of
`process.env`, also used by `ConfigEnv`), and the `GitClient`
interface with `createGitClient` and `CreateGitClientOptions`.
For run files it provides `writeRunFile` with `WriteRunFileOptions`,
`runFilePath`, `readRunFile`, and `readRunFileEntries` with `RunFileEntry`
and `RunHeader`.
For storage backends it provides the `StorageReader`, `StorageWriter` and
`Storage` interfaces with `ListRunsQuery`, and `parseListRunsQuery` with
`ParsedListRunsQuery`. For error messages, `describeIssues` summarizes Zod
issues and `quoteForMessage` quotes a path or a value from data, escaped and
capped.
The analysis pipeline and error fingerprinting are planned.

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
  await runCommand();
} catch (error) {
  if (!isAtiumError(error)) {
    throw error;
  }
  // An expected failure, such as CONFIG_INVALID: show it and exit with code 2.
  process.stderr.write(`${error.message}\n${error.hint ?? ""}\n`);
  process.exitCode = 2;
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

Paths stored in the model are POSIX and relative to the repository root, and
the identity of a test is derived from them. `toPosixRelative` recognizes
Windows paths on any operating system. `computeTestId` takes a `TestIdentity`
(the original `project`, `file` and `titlePath`) and joins the levels of the
title with `TITLE_PATH_SEPARATOR` (`" › "`):

```ts
import { computeTestId, TITLE_PATH_SEPARATOR, toPosixRelative } from "@atium/core";
import type { TestIdentity } from "@atium/core";

const file = toPosixRelative("C:\\repo", "C:\\repo\\tests\\cart.spec.ts"); // "tests/cart.spec.ts"
const test: TestIdentity = { project: "chromium", file, titlePath: ["cart", "checkout"] };
const testId = computeTestId(test);
const title = test.titlePath.join(TITLE_PATH_SEPARATOR); // "cart › checkout"
```

A path that comes from data (an artifact in a report, a fixture, a storage
path) is resolved with `resolveInside` before reading or writing it. It throws
an `AtiumError` with code `MODEL_INVALID` if the path escapes the root or, on
Windows, has a name Windows would not open as written (such as `CON` or a
trailing dot). The check is lexical, so it does not follow symlinks:

```ts
import { resolveInside } from "@atium/core";

const trace = resolveInside(repoRoot, attachment.path);
```

A finding's fingerprint hashes the parts that identify it, without line
numbers, so the baseline survives edits. Every output sorts findings with
`compareFindings` (file, line, column, rule, then fingerprint; findings without
a location last):

```ts
import { compareFindings, fingerprintOf, FindingSchema, TITLE_PATH_SEPARATOR } from "@atium/core";

const finding = FindingSchema.parse({
  fingerprint: fingerprintOf([
    "E2E001",
    file,
    titlePath.join(TITLE_PATH_SEPARATOR),
    normalizedCode,
    String(occurrence),
  ]),
  analyzer: "lint",
  ruleId: "E2E001",
  severity: "warning",
  category: "reliability",
  source: "rule",
  confidence: "high",
  message: "Avoid fixed waits; wait for a condition instead.",
  location: { file, line: 12, column: 5 },
});
const ordered = findings.toSorted(compareFindings);
```

Secrets are redacted before anything is persisted or logged. `createRedactor`
takes the `redact` section of the config (validated with `RedactConfigSchema`,
which fills in the defaults) and replaces each secret with `[REDACTED]`. The
built-in patterns, listed in `REDACT_PATTERN_IDS`, are `jwt`, `bearer`,
`aws-key`, `gcp-key` and `azure-key`; they run in linear time, so they are safe
on untrusted text. Sensitive headers and body fields are matched by name
fragment, ignoring case and separators, so `token` also covers `accessToken`
and `X-Auth-Token`. `redactFields` walks JSON values only: parse a body first.
Redact before truncating, since half a secret may no longer match:

```ts
import { createRedactor, RedactConfigSchema, truncateUtf8 } from "@atium/core";

const { redact, redactHeaders, redactFields } = createRedactor(RedactConfigSchema.parse({}));

const message = truncateUtf8(redact(rawMessage), 2048);
redactHeaders({ Authorization: "Basic dXNlcjpwYXNz" }); // { Authorization: "[REDACTED]" }
redactFields({ user: { accessToken: "t", name: "Ana" } }); // accessToken becomes "[REDACTED]"
```

Atium's own diagnostics go to stderr through `createStderrLogger`, one line
per entry. It redacts the message and the context before writing, writes
entries down to `level` (`info` by default), writes `debug` entries only with
`level: "debug"`, with `verbose` or when `DEBUG` enables its namespace (for
example `DEBUG=atium:*`), colors the level only on a terminal without
`NO_COLOR`, and never throws. Code that needs the time takes a `Clock`;
`systemClock` is the real one:

```ts
import { createRedactor, createStderrLogger, RedactConfigSchema } from "@atium/core";

const logger = createStderrLogger({
  stream: process.stderr,
  env: process.env,
  redactor: createRedactor(RedactConfigSchema.parse({})),
  namespace: "atium:cli",
  verbose: false,
});
logger.warn("history sync failed; continuing without it", { error });
// atium:cli warn history sync failed; continuing without it {"error":{"name":"Error","message":"..."}}
```

The config lives in `atium.config.{ts,mts,js,mjs,json}`; `defineConfig` only
adds types:

```ts
// atium.config.ts
import { defineConfig } from "@atium/core";

export default defineConfig({
  adapters: ["playwright"],
  quarantine: { mode: "run-and-ignore" },
});
```

`loadConfig` finds the file (`flags.config`, else `ATIUM_CONFIG`, else the
single `atium.config.*` in `cwd`), loads it with jiti, imported only then, and
validates it. Without a file, every section takes its defaults. Precedence is
flags > `ATIUM_*` variables > file > defaults; in V0 only `ATIUM_CONFIG` and
`ATIUM_LOG_LEVEL` are read. An invalid config throws `CONFIG_INVALID` with the
key path, the value received and a hint, which suggests the closest known key
for a misspelled one (`storgae` → `storage`). The resolved log level and
`redact` section configure the logger:

```ts
import { createRedactor, createStderrLogger, loadConfig } from "@atium/core";

const { config, logLevel } = await loadConfig({
  cwd: process.cwd(),
  env: process.env,
  flags: { config: options.config },
});
const logger = createStderrLogger({
  stream: process.stderr,
  env: process.env,
  redactor: createRedactor(config.redact),
  namespace: "atium:cli",
  level: logLevel,
});
```

`detectRunContext` fills the `git` and `ci` sections of a run. It reads
GitHub Actions, GitLab CI, Jenkins, CircleCI and Azure Pipelines with rules
of its own, and other CI providers with env-ci; outside CI, the provider is
`local`. In a GitHub pull request, `commitSha` is the merge commit, and
`headSha` and `prNumber` come from the event payload. `ATIUM_COMMIT_SHA`
and `ATIUM_BRANCH` override the provider. Git is only queried when the commit
is not in the environment, and `dirty` is only checked locally. Without Git,
it throws `GIT_UNAVAILABLE` with a hint:

```ts
import { createGitClient, detectRunContext } from "@atium/core";

const { git, ci } = await detectRunContext({
  env: process.env,
  cwd: process.cwd(),
  git: createGitClient({ cwd: process.cwd() }),
  logger,
});
```

`writeRunFile` writes a run to `.atium/runs/<runId>.ndjson.gz` under the
repository root, in the format of ADR-0018: gzip with the header (the run
without `results`) on line 1 and one `TestResult` per line. It removes ANSI
codes and applies the list and text caps first, and trims the detail of a
result whose line would exceed 768 KiB, marking it `detailTruncated`. The
write is atomic (a temporary file and `rename`), and an existing file is
never replaced (`STORAGE_CONFLICT`). Texts must be redacted before.
`readRunFile` reads a whole run back; `readRunFileEntries` streams the header
and then each result. Both validate every line and reject a file over the
size limits with `MODEL_INVALID` and the line number:

```ts
import { readRunFileEntries, writeRunFile } from "@atium/core";

const file = await writeRunFile(run, { rootDir: repoRoot, logger });
for await (const entry of readRunFileEntries(file)) {
  if (entry.kind === "result") {
    console.log(entry.result.test.testId, entry.result.outcome);
  }
}
```

A storage backend implements `Storage`: `writeRun`, `getRun`, `listRuns` and
`close`. Analyzers receive only a `StorageReader`. The operations return a
`Result`: a missing run is `ok(undefined)`, a repeated id is
`STORAGE_CONFLICT` and an unreachable or closed storage is
`STORAGE_UNAVAILABLE`. `listRuns` returns the most recent runs first, filtered
by `branch` (exact match) and `since` (inclusive), up to `limit`:

```ts
import type { Logger, Run, StorageReader } from "@atium/core";

async function recentOnMain(storage: StorageReader, logger: Logger): Promise<readonly Run[]> {
  const result = await storage.listRuns({ branch: "main", limit: 50 });
  if (!result.ok) {
    logger.warn("History not available; analyzing without it", { error: result.error });
    return [];
  }
  return result.value;
}
```

`since` must be an ISO 8601 date-time with `Z` or an offset, such as
`2026-10-01T00:00:00Z`; one without a zone throws `RangeError`, like a
`limit` that is not an integer of at least 1.

A backend checks the query with `parseListRunsQuery` before doing anything
else, so every backend rejects the same queries. It returns `since` as
`sinceMs`, an instant in milliseconds:

```ts
import { parseListRunsQuery } from "@atium/core";

const { branch, sinceMs, limit } = parseListRunsQuery(query); // throws RangeError if invalid
```

`describeIssues` turns the issues of a failed `safeParse` into a bounded,
escaped summary for an error message, so a message never dumps run data:

```ts
import { AtiumError, describeIssues, RunSchema } from "@atium/core";

const parsed = RunSchema.safeParse(run);
if (!parsed.success) {
  throw new AtiumError("MODEL_INVALID", `Invalid run (${describeIssues(parsed.error.issues)}).`);
}
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
- `FakeGitClient`: a `GitClient` that answers from memory (a `FakeGitState`)
  and records every query as a `GitQuery`; `new FakeGitClient("unavailable")`
  throws `GIT_UNAVAILABLE`.
- `fixedClock(ms)`: a `Clock` that always returns the same time.
- `InMemoryStorage`: a `Storage` that keeps runs in memory. Every backend,
  this one included, passes the contract suite in
  `test-contracts/storage.contract.ts`.
- `FIXED_START` and `fixedTimePlus(ms)`: the start time of every built run,
  and an instant that many milliseconds after it.
- `thrownAtiumError(action)` and `rejectedAtiumError(promise)`: return the
  `AtiumError` thrown or rejected with, and fail the test on anything else.

```ts
import { aRun, aTestResult } from "@atium/core/testing";

const run = aRun()
  .onCommit("abc123")
  .withResult(aTestResult("checkout").failedThenPassed())
  .build();
```

The `@atium/core/test-contracts` entry point exposes that suite as
`storageContract` to the tests of other packages. It is ESM only, because it
imports Vitest, and internal like `@atium/core/testing`:

```ts
import { storageContract } from "@atium/core/test-contracts";

storageContract(async () => createMyStorage());
```

## Configuration

This package defines the schema of `atium.config.*` and loads it (see
`defineConfig` and `loadConfig` above); it has no settings of its own.

## Documentation

See the [design documents](../../docs/design/README.md) for the full picture.
