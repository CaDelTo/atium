import type { Attempt, ErrorOccurrence, Run, RunSchema, TestResult } from "@atium/core";
import type { z } from "zod";
import type { attempts, errors, runs, testCases, testResults } from "./schema.js";

/** A row of `runs`, with every column present. */
export type RunRow = typeof runs.$inferSelect;
/** A row of `test_results`, with every column present. */
export type TestResultRow = typeof testResults.$inferSelect;
/** A row of `attempts`, with every column present. */
export type AttemptRow = typeof attempts.$inferSelect;
/** A row of `test_cases`, with every column present. */
type TestCaseRow = typeof testCases.$inferSelect;
/** A row of `errors`, with every column present. */
type ErrorRow = typeof errors.$inferSelect;

/** Every row that stores one run. */
export interface RunRows {
  readonly run: RunRow;
  readonly testResults: readonly TestResultRow[];
  readonly attempts: readonly AttemptRow[];
  /** One per result: the test as this run saw it, first and last seen at the run's start. */
  readonly testCases: readonly TestCaseRow[];
  /** One per attempt with an error, repeated fingerprints included. */
  readonly errors: readonly ErrorRow[];
}

/**
 * A run rebuilt from its rows, before validation. The ids are plain strings
 * until `RunSchema` checks and brands them.
 */
export type UncheckedRun = z.input<typeof RunSchema>;

/**
 * Splits a run into the rows of each table. Every column is present, `null`
 * when the field is absent, as the prepared statements expect.
 *
 * @param run - A valid run whose `testId`s are unique and whose attempt
 *   indexes are unique within each result.
 * @returns The rows that store it.
 */
export function runToRows(run: Run): RunRows {
  const startedAtMs = Date.parse(run.startedAt);
  return {
    run: runRow(run, startedAtMs),
    testResults: run.results.map((result, position) =>
      testResultRow(run, result, { position, startedAtMs }),
    ),
    attempts: run.results.flatMap((result) =>
      result.attempts.map((attempt, position) => attemptRow(run, result, { attempt, position })),
    ),
    testCases: run.results.map(({ test }) => ({
      testId: test.testId,
      project: orNull(test.project),
      file: test.file,
      titlePath: test.titlePath,
      tags: test.tags,
      firstSeenMs: startedAtMs,
      lastSeenMs: startedAtMs,
    })),
    errors: run.results.flatMap(({ attempts }) =>
      attempts.flatMap(({ error }) =>
        error === undefined
          ? []
          : [
              {
                fingerprint: error.fingerprint,
                type: error.type,
                family: error.family,
                sampleMessage: error.message,
              },
            ],
      ),
    ),
  };
}

function runRow(run: Run, startedAtMs: number): RunRow {
  const { git, environment } = run;
  return {
    id: run.id,
    schemaVersion: run.schemaVersion,
    commitSha: git.commitSha,
    headSha: orNull(git.headSha),
    branch: orNull(git.branch),
    baseBranch: orNull(git.baseBranch),
    dirty: git.dirty,
    ...ciColumns(run.ci),
    os: environment.os,
    arch: environment.arch,
    nodeVersion: environment.nodeVersion,
    frameworkName: environment.framework.name,
    frameworkVersion: orNull(environment.framework.version),
    frameworkConfig: orNull(run.frameworkConfig),
    startedAt: run.startedAt,
    startedAtMs,
    finishedAt: run.finishedAt,
  };
}

type CiColumns = Pick<
  RunRow,
  | "ciProvider"
  | "ciRunId"
  | "ciRunAttempt"
  | "ciJobId"
  | "ciShardIndex"
  | "ciShardTotal"
  | "ciPrNumber"
>;

function ciColumns(ci: Run["ci"]): CiColumns {
  if (ci === undefined) {
    return {
      ciProvider: null,
      ciRunId: null,
      ciRunAttempt: null,
      ciJobId: null,
      ciShardIndex: null,
      ciShardTotal: null,
      ciPrNumber: null,
    };
  }
  return {
    ciProvider: ci.provider,
    ciRunId: orNull(ci.runId),
    ciRunAttempt: orNull(ci.runAttempt),
    ciJobId: orNull(ci.jobId),
    ciShardIndex: orNull(ci.shard?.index),
    ciShardTotal: orNull(ci.shard?.total),
    ciPrNumber: orNull(ci.prNumber),
  };
}

function testResultRow(
  run: Run,
  result: TestResult,
  where: { readonly position: number; readonly startedAtMs: number },
): TestResultRow {
  const { test } = result;
  return {
    runId: run.id,
    testId: test.testId,
    position: where.position,
    startedAtMs: where.startedAtMs,
    project: orNull(test.project),
    file: test.file,
    titlePath: test.titlePath,
    tags: test.tags,
    locationLine: orNull(test.location?.line),
    locationColumn: orNull(test.location?.column),
    outcome: result.outcome,
    attemptsDropped: orNull(result.attemptsDropped),
    workerIndex: orNull(result.workerIndex),
    sequenceInWorker: orNull(result.sequenceInWorker),
    quarantined: result.quarantined,
    bdd: orNull(result.bdd),
    detailTruncated: result.detailTruncated === true ? 1 : null,
  };
}

function attemptRow(
  run: Run,
  result: TestResult,
  where: { readonly attempt: Attempt; readonly position: number },
): AttemptRow {
  const { attempt } = where;
  return {
    runId: run.id,
    testId: result.test.testId,
    attemptIndex: attempt.index,
    position: where.position,
    status: attempt.status,
    startedAt: attempt.startedAt,
    durationMs: attempt.durationMs,
    ...errorColumns(attempt.error),
    network: orNull(attempt.network),
    console: orNull(attempt.console),
    pageErrors: orNull(attempt.pageErrors),
    pageErrorsDropped: orNull(attempt.pageErrorsDropped),
    artifacts: orNull(attempt.artifacts),
  };
}

type ErrorColumns = Pick<
  AttemptRow,
  | "errorFingerprint"
  | "errorFamily"
  | "errorType"
  | "errorMessage"
  | "errorStack"
  | "errorLocator"
  | "errorMatcher"
  | "errorFailedAtMs"
>;

function errorColumns(error: ErrorOccurrence | undefined): ErrorColumns {
  if (error === undefined) {
    return {
      errorFingerprint: null,
      errorFamily: null,
      errorType: null,
      errorMessage: null,
      errorStack: null,
      errorLocator: null,
      errorMatcher: null,
      errorFailedAtMs: null,
    };
  }
  return {
    errorFingerprint: error.fingerprint,
    errorFamily: error.family,
    errorType: error.type,
    errorMessage: error.message,
    errorStack: orNull(error.stack),
    errorLocator: orNull(error.locator),
    errorMatcher: orNull(error.matcher),
    errorFailedAtMs: error.failedAtMs,
  };
}

/** The column value of an optional field. */
function orNull<T>(value: T | undefined): T | null {
  return value ?? null;
}

/**
 * Rebuilds a run from its rows. Absent fields stay absent: a `null` column
 * leaves its key out instead of setting it to `undefined`.
 *
 * @param run - The row of `runs`.
 * @param results - Its rows of `test_results`, ordered by `position`.
 * @param attemptRows - Its rows of `attempts`, ordered by `position`.
 * @returns The run, still to be validated with `RunSchema`.
 * @throws {@link CorruptRowError} if the columns of one field disagree, such
 *   as an attempt with an error fingerprint but no error message.
 */
export function rowsToRun(
  run: RunRow,
  results: readonly TestResultRow[],
  attemptRows: readonly AttemptRow[],
): UncheckedRun {
  const attemptsByTest = groupByTest(attemptRows);
  return {
    schemaVersion: run.schemaVersion,
    id: run.id,
    git: {
      commitSha: run.commitSha,
      ...present("headSha", run.headSha),
      ...present("branch", run.branch),
      ...present("baseBranch", run.baseBranch),
      dirty: run.dirty,
    },
    ...present("ci", ciOf(run)),
    environment: {
      os: run.os,
      arch: run.arch,
      nodeVersion: run.nodeVersion,
      framework: {
        name: run.frameworkName,
        ...present("version", run.frameworkVersion),
      },
    },
    ...present("frameworkConfig", run.frameworkConfig),
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    results: results.map((row) => testResultOf(row, attemptsByTest.get(row.testId) ?? [])),
  };
}

function groupByTest(rows: readonly AttemptRow[]): Map<string, AttemptRow[]> {
  const groups = new Map<string, AttemptRow[]>();
  for (const row of rows) {
    const group = groups.get(row.testId);
    if (group === undefined) {
      groups.set(row.testId, [row]);
    } else {
      group.push(row);
    }
  }
  return groups;
}

function ciOf(run: RunRow): NonNullable<UncheckedRun["ci"]> | null {
  if (run.ciProvider === null) {
    const stray = [
      run.ciRunId,
      run.ciRunAttempt,
      run.ciJobId,
      run.ciShardIndex,
      run.ciShardTotal,
      run.ciPrNumber,
    ].some((value) => value !== null);
    if (stray) {
      throw new CorruptRowError("Columns ci_* hold values but ci_provider is null.");
    }
    return null;
  }
  const shard = bothOrNeither(run.ciShardIndex, run.ciShardTotal, "ci_shard_*");
  return {
    provider: run.ciProvider,
    ...present("runId", run.ciRunId),
    ...present("runAttempt", run.ciRunAttempt),
    ...present("jobId", run.ciJobId),
    ...(shard === null ? {} : { shard: { index: shard[0], total: shard[1] } }),
    ...present("prNumber", run.ciPrNumber),
  };
}

function testResultOf(
  row: TestResultRow,
  attemptRows: readonly AttemptRow[],
): UncheckedRun["results"][number] {
  const location = bothOrNeither(row.locationLine, row.locationColumn, "location_*");
  return {
    test: {
      testId: row.testId,
      ...present("project", row.project),
      file: row.file,
      titlePath: row.titlePath,
      tags: row.tags,
      ...(location === null ? {} : { location: { line: location[0], column: location[1] } }),
    },
    outcome: row.outcome,
    attempts: attemptRows.map(attemptOf),
    ...present("attemptsDropped", row.attemptsDropped),
    ...present("workerIndex", row.workerIndex),
    ...present("sequenceInWorker", row.sequenceInWorker),
    quarantined: row.quarantined,
    ...present("bdd", row.bdd),
    ...truncationFlag(row.detailTruncated),
  };
}

function attemptOf(row: AttemptRow): UncheckedRun["results"][number]["attempts"][number] {
  return {
    index: row.attemptIndex,
    status: row.status,
    startedAt: row.startedAt,
    durationMs: row.durationMs,
    ...present("error", errorOf(row)),
    ...present("network", row.network),
    ...present("console", row.console),
    ...present("pageErrors", row.pageErrors),
    ...present("pageErrorsDropped", row.pageErrorsDropped),
    ...present("artifacts", row.artifacts),
  };
}

type UncheckedError = NonNullable<UncheckedRun["results"][number]["attempts"][number]["error"]>;

function errorOf(row: AttemptRow): UncheckedError | null {
  // A fingerprint marks an attempt with an error; the other columns of the
  // error come with it.
  if (row.errorFingerprint === null) {
    return null;
  }
  return {
    fingerprint: row.errorFingerprint,
    family: required(row.errorFamily, "error_family"),
    type: required(row.errorType, "error_type"),
    message: required(row.errorMessage, "error_message"),
    ...present("stack", row.errorStack),
    ...present("locator", row.errorLocator),
    ...present("matcher", row.errorMatcher),
    failedAtMs: required(row.errorFailedAtMs, "error_failed_at_ms"),
  };
}

/** A stored row that cannot be turned back into a run, such as an error without its message. */
export class CorruptRowError extends Error {
  override readonly name = "CorruptRowError";
}

/**
 * Two columns that store one optional field: both set, or both null.
 *
 * @throws {@link CorruptRowError} if only one of them is set.
 */
function bothOrNeither(
  first: number | null,
  second: number | null,
  columns: string,
): readonly [number, number] | null {
  if (first === null && second === null) {
    return null;
  }
  if (first === null || second === null) {
    throw new CorruptRowError(`Only one of the columns ${columns} is null.`);
  }
  return [first, second];
}

function truncationFlag(value: number | null): { readonly detailTruncated?: true } {
  if (value === null) {
    return {};
  }
  if (value !== 1) {
    throw new CorruptRowError(
      `Column detail_truncated holds ${String(value)} instead of 1 or null.`,
    );
  }
  return { detailTruncated: true };
}

function required<V>(value: V | null, column: string): V {
  if (value === null) {
    throw new CorruptRowError(`Column ${column} of an attempt with an error is null.`);
  }
  return value;
}

/** `{ [key]: value }`, or `{}` when the column is `null`, so absent fields stay absent. */
function present<K extends string, V>(key: K, value: V | null): Partial<Record<K, V>> {
  // A computed key widens to `{ [x: string]: V }`; `key` is exactly `K`.
  return value === null ? {} : ({ [key]: value } as Record<K, V>);
}
