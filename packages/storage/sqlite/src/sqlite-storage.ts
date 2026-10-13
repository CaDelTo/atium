import { fileURLToPath } from "node:url";
import {
  AtiumError,
  describeIssues,
  err,
  ok,
  parseListRunsQuery,
  quoteForMessage,
  RunSchema,
} from "@atium/core";
import type {
  ListRunsQuery,
  Logger,
  ParsedListRunsQuery,
  Result,
  Run,
  RunId,
  Storage,
} from "@atium/core";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { prepareDatabaseFile } from "./database-file.js";
import { SQLITE_BUSY_TIMEOUT_MS } from "./defaults.js";
import { invalidRunError } from "./invalid-run.js";
import { CorruptRowError, rowsToRun, runToRows } from "./run-rows.js";
import type { RunRow, RunRows } from "./run-rows.js";
import { prepareStatements } from "./statements.js";
import type { Statements } from "./statements.js";

/** Where {@link openSqliteStorage} opens the database. */
export interface OpenSqliteStorageOptions {
  /** Root of the repository. The database must stay inside it. */
  readonly rootDir: string;
  /**
   * Path of the database file, relative to `rootDir` or absolute inside it.
   * Defaults to `.atium/atium.db`.
   */
  readonly path?: string;
  /** Receives the warnings that do not stop the storage, such as a failed `close`. */
  readonly logger: Logger;
}

// One level up from `src/` in tests and from `dist/` once built.
const MIGRATIONS_FOLDER = fileURLToPath(new URL("../drizzle", import.meta.url));

/**
 * Opens the local SQLite storage (15-storage.md §23.6). It creates the
 * database and its directory when they do not exist and applies the pending
 * migrations.
 *
 * The database uses WAL mode, so readers do not block the writer; if the file
 * system does not support it, the storage still opens and logs a warning. A
 * new file is readable only by its owner, like run files, and a database path
 * that is a symlink or that a symlink takes outside `rootDir` is rejected.
 * Each `writeRun` stores the whole run in one transaction.
 *
 * Besides the codes of {@link Storage}, `writeRun` returns `MODEL_INVALID`
 * for a run that does not match `RunSchema` or that repeats a `testId`, or an
 * attempt `index` within a result; `getRun` and `listRuns` return it for a
 * stored run that no longer matches `RunSchema`.
 *
 * Texts are stored as they come: redact them before `writeRun`
 * (20-security-privacy.md §28.1).
 *
 * @param options - The repository root, the database path and a logger.
 * @returns The storage, `MODEL_INVALID` if `path` leads outside `rootDir` or
 *   is a symlink, or `STORAGE_UNAVAILABLE` if the database cannot be created,
 *   opened or migrated.
 *
 * @example
 * ```ts
 * const opened = await openSqliteStorage({ rootDir: repoRoot, logger });
 * if (opened.ok) {
 *   await opened.value.writeRun(run);
 *   await opened.value.close();
 * }
 * ```
 */
export async function openSqliteStorage(
  options: OpenSqliteStorageOptions,
): Promise<Result<Storage>> {
  const prepared = await prepareDatabaseFile(options.rootDir, options.path);
  if (!prepared.ok) {
    return prepared;
  }
  const file = prepared.value;
  let client: Database.Database | undefined;
  try {
    client = new Database(file, { timeout: SQLITE_BUSY_TIMEOUT_MS });
    const mode: unknown = client.pragma("journal_mode = WAL", { simple: true });
    if (mode !== "wal") {
      options.logger.warn("SQLite could not turn on WAL mode; readers may block writes", {
        file,
        mode,
      });
    }
    client.pragma("foreign_keys = ON");
    const db = drizzle({ client });
    migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
    return ok(new SqliteStorage(client, prepareStatements(db), { file, logger: options.logger }));
  } catch (error) {
    client?.close();
    return err(unavailable(`open the SQLite database at ${quoteForMessage(file)}`, error));
  }
}

/** {@link Storage} on a local SQLite database. Created by {@link openSqliteStorage}. */
class SqliteStorage implements Storage {
  readonly #client: Database.Database;
  readonly #statements: Statements;
  readonly #file: string;
  readonly #logger: Logger;
  readonly #write: Database.Transaction<(rows: RunRows) => Result<void>>;
  #closed = false;

  constructor(
    client: Database.Database,
    statements: Statements,
    where: { readonly file: string; readonly logger: Logger },
  ) {
    this.#client = client;
    this.#statements = statements;
    this.#file = where.file;
    this.#logger = where.logger;
    this.#write = client.transaction((rows: RunRows) => this.#insert(rows));
  }

  writeRun(run: Run): Promise<Result<void>> {
    return this.#guard("write to", () => {
      const invalid = invalidRunError(run);
      // `immediate` takes the write lock before checking the id, so two
      // processes cannot both find it free.
      return invalid === undefined ? this.#write.immediate(runToRows(run)) : err(invalid);
    });
  }

  getRun(id: RunId): Promise<Result<Run | undefined>> {
    return this.#guard("read from", () => {
      const row = this.#statements.runById.get({ id });
      return row === undefined ? ok(undefined) : this.#assemble(row);
    });
  }

  async listRuns(query: ListRunsQuery): Promise<Result<readonly Run[]>> {
    const parsed = parseListRunsQuery(query);
    return this.#guard("read from", () => this.#list(parsed));
  }

  close(): Promise<void> {
    if (!this.#closed) {
      this.#closed = true;
      try {
        this.#client.close();
      } catch (error) {
        // Fail-open (ADR-0006): the runs are already committed; closing only releases the file.
        this.#logger.warn("Could not close the SQLite database", { file: this.#file, error });
      }
    }
    return Promise.resolve();
  }

  #insert(rows: RunRows): Result<void> {
    const statements = this.#statements;
    if (statements.runExists.get({ id: rows.run.id }) !== undefined) {
      return err(
        new AtiumError(
          "STORAGE_CONFLICT",
          `Run ${quoteForMessage(rows.run.id)} already exists; runs are never replaced.`,
          { hint: "Give each run a new id." },
        ),
      );
    }
    statements.insertRun.run(rows.run);
    for (const row of rows.testResults) {
      statements.insertTestResult.run(row);
    }
    for (const row of rows.attempts) {
      statements.insertAttempt.run(row);
    }
    for (const row of rows.testCases) {
      statements.upsertTestCase.run(row);
    }
    for (const row of rows.errors) {
      statements.insertError.run(row);
    }
    return ok(undefined);
  }

  #list(query: ParsedListRunsQuery): Result<readonly Run[]> {
    const listed: Run[] = [];
    for (const row of this.#statements.listRuns(query)) {
      const run = this.#assemble(row);
      if (!run.ok) {
        return run;
      }
      listed.push(run.value);
    }
    return ok(listed);
  }

  #assemble(row: RunRow): Result<Run> {
    const which = `run ${quoteForMessage(row.id)}`;
    let unchecked;
    try {
      const results = this.#statements.resultsOf.all({ runId: row.id });
      const attemptRows = this.#statements.attemptsOf.all({ runId: row.id });
      unchecked = rowsToRun(row, results, attemptRows);
    } catch (error) {
      const detail = corruptionOf(error);
      if (detail === undefined) {
        throw error;
      }
      return err(corruptRunError(this.#file, `${which} (${detail})`));
    }
    const parsed = RunSchema.safeParse(unchecked);
    return parsed.success
      ? ok(parsed.data)
      : err(corruptRunError(this.#file, `${which} (${describeIssues(parsed.error.issues)})`));
  }

  /**
   * Runs `action` unless the storage is closed, turning what it throws into
   * a `Result`: storage errors never reach the caller as exceptions (ADR-0006).
   */
  #guard<T>(verb: string, action: () => Result<T>): Promise<Result<T>> {
    if (this.#closed) {
      return Promise.resolve(err(closedError()));
    }
    try {
      return Promise.resolve(action());
    } catch (error) {
      // A row of `runs` is parsed before `#assemble` knows its id.
      const detail = corruptionOf(error);
      return Promise.resolve(
        err(
          detail === undefined
            ? unavailable(`${verb} the SQLite database at ${quoteForMessage(this.#file)}`, error)
            : corruptRunError(this.#file, `a run (${detail})`),
        ),
      );
    }
  }
}

function unavailable(what: string, cause: unknown): AtiumError {
  return new AtiumError("STORAGE_UNAVAILABLE", `Could not ${what}.`, {
    cause,
    hint: "Check that its directory is writable and that no other program locks it. Deleting the file starts a new, empty history.",
  });
}

/**
 * What makes a stored row unreadable, or `undefined` if `error` is not about
 * the data. Never the message of a `SyntaxError`: `JSON.parse` quotes part of
 * the stored text, which is run data (15-storage.md §23.2.1).
 */
function corruptionOf(error: unknown): string | undefined {
  if (error instanceof CorruptRowError) {
    return error.message;
  }
  return error instanceof SyntaxError ? "a JSON column does not parse" : undefined;
}

function corruptRunError(file: string, what: string): AtiumError {
  return new AtiumError(
    "MODEL_INVALID",
    `The SQLite database at ${quoteForMessage(file)} holds ${what} that no longer matches the run schema.`,
    {
      hint: "The database was edited or damaged outside Atium. Delete the file to start a new, empty history.",
    },
  );
}

function closedError(): AtiumError {
  return new AtiumError("STORAGE_UNAVAILABLE", "The storage was closed.", {
    hint: "This is a bug: do not use a storage after closing it.",
  });
}
