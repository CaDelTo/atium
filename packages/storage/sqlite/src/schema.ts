import type { Attempt, ErrorOccurrence, FrameworkName, Run, TestResult } from "@atium/core";
import { foreignKey, index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Tables of the local database (15-storage.md §23.6). `test_results` and
// `attempts` hold what each run observed, so a run reads back exactly as it was
// written; `test_cases` and `errors` are catalogs derived from them. Nested
// structures without a table of their own yet are JSON columns. The `$type`s
// describe what `writeRun` stores; reads check it again with `RunSchema`. Timestamps
// keep their original text; the `*_ms` columns hold the same instant for
// ordering and filtering.

/** One row per run: its Git, CI and environment metadata. */
export const runs = sqliteTable(
  "runs",
  {
    id: text("id").primaryKey(),
    schemaVersion: integer("schema_version").$type<Run["schemaVersion"]>().notNull(),
    commitSha: text("commit_sha").notNull(),
    headSha: text("head_sha"),
    branch: text("branch"),
    baseBranch: text("base_branch"),
    dirty: integer("dirty", { mode: "boolean" }).notNull(),
    /** Absent `ci` when null; `provider` is required inside it. */
    ciProvider: text("ci_provider"),
    ciRunId: text("ci_run_id"),
    ciRunAttempt: integer("ci_run_attempt"),
    ciJobId: text("ci_job_id"),
    ciShardIndex: integer("ci_shard_index"),
    ciShardTotal: integer("ci_shard_total"),
    ciPrNumber: integer("ci_pr_number"),
    os: text("os").notNull(),
    arch: text("arch").notNull(),
    nodeVersion: text("node_version").notNull(),
    frameworkName: text("framework_name").$type<FrameworkName>().notNull(),
    frameworkVersion: text("framework_version"),
    frameworkConfig: text("framework_config", { mode: "json" }).$type<
      NonNullable<Run["frameworkConfig"]>
    >(),
    startedAt: text("started_at").notNull(),
    startedAtMs: integer("started_at_ms").notNull(),
    finishedAt: text("finished_at").notNull(),
  },
  (table) => [
    index("runs_commit_sha_idx").on(table.commitSha),
    index("runs_branch_started_at_idx").on(table.branch, table.startedAtMs, table.id),
    index("runs_started_at_idx").on(table.startedAtMs, table.id),
  ],
);

/** Catalog of tests: the latest known identity and when each test was first and last seen. */
export const testCases = sqliteTable("test_cases", {
  testId: text("test_id").primaryKey(),
  project: text("project"),
  file: text("file").notNull(),
  titlePath: text("title_path", { mode: "json" }).$type<readonly string[]>().notNull(),
  tags: text("tags", { mode: "json" }).$type<readonly string[]>().notNull(),
  firstSeenMs: integer("first_seen_ms").notNull(),
  lastSeenMs: integer("last_seen_ms").notNull(),
});

/** Final result of each test in each run, with the test as that run saw it. */
export const testResults = sqliteTable(
  "test_results",
  {
    runId: text("run_id")
      .notNull()
      .references(() => runs.id, { onDelete: "cascade" }),
    testId: text("test_id").notNull(),
    /** Position in `Run.results`, from 0. */
    position: integer("position").notNull(),
    /** Start of the run, repeated here for the `(test_id, started_at_ms)` index. */
    startedAtMs: integer("started_at_ms").notNull(),
    project: text("project"),
    file: text("file").notNull(),
    titlePath: text("title_path", { mode: "json" }).$type<readonly string[]>().notNull(),
    tags: text("tags", { mode: "json" }).$type<readonly string[]>().notNull(),
    locationLine: integer("location_line"),
    locationColumn: integer("location_column"),
    outcome: text("outcome").$type<TestResult["outcome"]>().notNull(),
    attemptsDropped: integer("attempts_dropped"),
    workerIndex: integer("worker_index"),
    sequenceInWorker: integer("sequence_in_worker"),
    quarantined: integer("quarantined", { mode: "boolean" }).notNull(),
    bdd: text("bdd", { mode: "json" }).$type<NonNullable<TestResult["bdd"]>>(),
    /** 1 when the writer trimmed detail, else null. Not a boolean column: Drizzle reads its null as false. */
    detailTruncated: integer("detail_truncated"),
  },
  (table) => [
    primaryKey({ columns: [table.runId, table.testId] }),
    index("test_results_test_id_started_at_idx").on(table.testId, table.startedAtMs),
  ],
);

/** Each attempt of each test in each run, with its error occurrence. */
export const attempts = sqliteTable(
  "attempts",
  {
    runId: text("run_id").notNull(),
    testId: text("test_id").notNull(),
    attemptIndex: integer("attempt_index").notNull(),
    /** Position in `TestResult.attempts`, from 0. */
    position: integer("position").notNull(),
    status: text("status").$type<Attempt["status"]>().notNull(),
    startedAt: text("started_at").notNull(),
    durationMs: integer("duration_ms").notNull(),
    errorFingerprint: text("error_fingerprint"),
    errorFamily: text("error_family"),
    errorType: text("error_type"),
    errorMessage: text("error_message"),
    errorStack: text("error_stack"),
    errorLocator: text("error_locator"),
    errorMatcher: text("error_matcher", { mode: "json" }).$type<
      NonNullable<ErrorOccurrence["matcher"]>
    >(),
    errorFailedAtMs: integer("error_failed_at_ms"),
    network: text("network", { mode: "json" }).$type<NonNullable<Attempt["network"]>>(),
    console: text("console", { mode: "json" }).$type<NonNullable<Attempt["console"]>>(),
    pageErrors: text("page_errors", { mode: "json" }).$type<NonNullable<Attempt["pageErrors"]>>(),
    pageErrorsDropped: integer("page_errors_dropped"),
    artifacts: text("artifacts", { mode: "json" }).$type<NonNullable<Attempt["artifacts"]>>(),
  },
  (table) => [
    primaryKey({ columns: [table.runId, table.testId, table.attemptIndex] }),
    foreignKey({
      columns: [table.runId, table.testId],
      foreignColumns: [testResults.runId, testResults.testId],
    }).onDelete("cascade"),
    index("attempts_error_fingerprint_idx").on(table.errorFingerprint),
  ],
);

/** Catalog of errors: one row per fingerprint, with the first occurrence written as sample. */
export const errors = sqliteTable("errors", {
  fingerprint: text("fingerprint").primaryKey(),
  type: text("type").notNull(),
  family: text("family").notNull(),
  sampleMessage: text("sample_message").notNull(),
});
