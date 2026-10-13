import type { ParsedListRunsQuery } from "@atium/core";
import { and, asc, desc, eq, getTableColumns, gte, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type { SQLiteColumn, SQLiteTable } from "drizzle-orm/sqlite-core";
import type { RunRow } from "./run-rows.js";
import { attempts, errors, runs, testCases, testResults } from "./schema.js";

type Placeholder = ReturnType<typeof sql.placeholder>;

/**
 * A placeholder named after each column, so a row object with every column
 * fills the statement (05-performance.md: reused prepared statements).
 */
function placeholdersFor<T extends SQLiteTable>(
  table: T,
): { [K in keyof T["$inferInsert"]]-?: Placeholder } {
  const entries = Object.keys(getTableColumns(table)).map((key) => [key, sql.placeholder(key)]);
  // `Object.fromEntries` loses the keys; they are exactly the table's columns.
  return Object.fromEntries(entries) as { [K in keyof T["$inferInsert"]]-?: Placeholder };
}

/** The value an upsert tried to insert into `column`. */
function excluded(column: SQLiteColumn): SQL {
  return sql`excluded.${sql.identifier(column.name)}`;
}

/** The new value of `column` if the run being written is the latest that saw the test, else the stored one. */
function fromLatestRun(column: SQLiteColumn): SQL {
  return sql`CASE WHEN ${excluded(testCases.lastSeenMs)} >= ${testCases.lastSeenMs} THEN ${excluded(column)} ELSE ${column} END`;
}

function readStatements(db: BetterSQLite3Database) {
  return {
    runExists: db
      .select({ id: runs.id })
      .from(runs)
      .where(eq(runs.id, sql.placeholder("id")))
      .prepare(),
    runById: db
      .select()
      .from(runs)
      .where(eq(runs.id, sql.placeholder("id")))
      .prepare(),
    resultsOf: db
      .select()
      .from(testResults)
      .where(eq(testResults.runId, sql.placeholder("runId")))
      .orderBy(asc(testResults.position))
      .prepare(),
    attemptsOf: db
      .select()
      .from(attempts)
      .where(eq(attempts.runId, sql.placeholder("runId")))
      .orderBy(asc(attempts.position))
      .prepare(),
  };
}

function writeStatements(db: BetterSQLite3Database) {
  return {
    insertRun: db.insert(runs).values(placeholdersFor(runs)).prepare(),
    insertTestResult: db.insert(testResults).values(placeholdersFor(testResults)).prepare(),
    insertAttempt: db.insert(attempts).values(placeholdersFor(attempts)).prepare(),
    upsertTestCase: db
      .insert(testCases)
      .values(placeholdersFor(testCases))
      .onConflictDoUpdate({
        target: testCases.testId,
        set: {
          project: fromLatestRun(testCases.project),
          file: fromLatestRun(testCases.file),
          titlePath: fromLatestRun(testCases.titlePath),
          tags: fromLatestRun(testCases.tags),
          firstSeenMs: sql`min(${testCases.firstSeenMs}, ${excluded(testCases.firstSeenMs)})`,
          lastSeenMs: sql`max(${testCases.lastSeenMs}, ${excluded(testCases.lastSeenMs)})`,
        },
      })
      .prepare(),
    // The first occurrence written stays as the sample.
    insertError: db.insert(errors).values(placeholdersFor(errors)).onConflictDoNothing().prepare(),
  };
}

function prepareListRuns(db: BetterSQLite3Database, hasBranch: boolean, hasSince: boolean) {
  return db
    .select()
    .from(runs)
    .where(
      and(
        hasBranch ? eq(runs.branch, sql.placeholder("branch")) : undefined,
        hasSince ? gte(runs.startedAtMs, sql.placeholder("sinceMs")) : undefined,
      ),
    )
    .orderBy(desc(runs.startedAtMs), desc(runs.id))
    .limit(sql.placeholder("limit"))
    .prepare();
}

/** The prepared statements of an open storage. */
export type Statements = ReturnType<typeof readStatements> &
  ReturnType<typeof writeStatements> & {
    /** Rows of the runs that match `query`, most recent first. */
    listRuns(query: ParsedListRunsQuery): RunRow[];
  };

/**
 * Prepares the statements the storage runs, once, when it opens. `listRuns`
 * prepares one statement per combination of filters on first use.
 *
 * @param db - The open database, already migrated.
 * @returns The statements.
 */
export function prepareStatements(db: BetterSQLite3Database): Statements {
  const listRunsStatements = new Map<string, ReturnType<typeof prepareListRuns>>();
  return {
    ...readStatements(db),
    ...writeStatements(db),
    listRuns(query) {
      const hasBranch = query.branch !== undefined;
      const hasSince = query.sinceMs !== undefined;
      const key = `${String(hasBranch)}:${String(hasSince)}`;
      let statement = listRunsStatements.get(key);
      if (statement === undefined) {
        statement = prepareListRuns(db, hasBranch, hasSince);
        listRunsStatements.set(key, statement);
      }
      return statement.all({ ...query });
    },
  };
}
