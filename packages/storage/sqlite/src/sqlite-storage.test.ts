import { mkdir, mkdtemp, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Result, Run, Storage } from "@atium/core";
import { aTestResult, anError, FakeLogger, unwrap } from "@atium/core/testing";
import { storageContract } from "@atium/core/test-contracts";
import Database from "better-sqlite3";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SQLITE_DATABASE_PATH } from "./defaults.js";
import { runAt, runWithEveryField } from "./runs.test-support.js";
import { openSqliteStorage } from "./sqlite-storage.js";

let tempRoot = "";
let repositories = 0;

beforeAll(async () => {
  tempRoot = await mkdtemp(join(tmpdir(), "atium-sqlite-"));
});

afterAll(async () => {
  await rm(tempRoot, { recursive: true, force: true });
});

/** A new, empty directory that plays the repository root. */
async function newRepository(): Promise<string> {
  repositories += 1;
  const root = join(tempRoot, `repo-${String(repositories)}`);
  await mkdir(root);
  return root;
}

function codeOf(result: Result<unknown>): string {
  return result.ok ? "ok" : result.error.code;
}

const logger = new FakeLogger();
const onPosix = process.platform !== "win32";

async function openIn(rootDir: string): Promise<Storage> {
  return unwrap(await openSqliteStorage({ rootDir, logger }));
}

function modeOf(stats: { readonly mode: number }): number {
  return stats.mode & 0o777;
}

/** A second connection to the database, to inspect or damage it from outside the storage. */
function connectTo(rootDir: string): Database.Database {
  return new Database(join(rootDir, SQLITE_DATABASE_PATH));
}

storageContract(async () => openIn(await newRepository()));

describe("openSqliteStorage", () => {
  it("creates the database and its directory at .atium/atium.db", async () => {
    const root = await newRepository();

    await (await openIn(root)).close();

    expect((await stat(join(root, ".atium", "atium.db"))).isFile()).toBe(true);
  });

  it("opens the database at the given path inside the repository", async () => {
    const root = await newRepository();

    await unwrap(
      await openSqliteStorage({ rootDir: root, path: "history/runs.db", logger }),
    ).close();

    expect((await stat(join(root, "history", "runs.db"))).isFile()).toBe(true);
  });

  it("keeps the runs written before the database was closed and opened again", async () => {
    const root = await newRepository();
    const run = runWithEveryField();
    const first = await openIn(root);
    unwrap(await first.writeRun(run));
    await first.close();

    const second = await openIn(root);

    expect(unwrap(await second.getRun(run.id))).toStrictEqual(run);
    await second.close();
  });

  it("turns on WAL mode", async () => {
    const root = await newRepository();
    await (await openIn(root)).close();

    const connection = connectTo(root);
    const mode: unknown = connection.pragma("journal_mode", { simple: true });
    connection.close();

    expect(mode).toBe("wal");
  });

  it.runIf(onPosix)(
    "keeps the database, its WAL files and its directory readable only by their owner",
    async () => {
      const root = await newRepository();
      const storage = await openIn(root);
      unwrap(await storage.writeRun(runAt(1, 0)));

      const modes = await Promise.all(
        [
          ".atium",
          SQLITE_DATABASE_PATH,
          `${SQLITE_DATABASE_PATH}-wal`,
          `${SQLITE_DATABASE_PATH}-shm`,
        ].map(async (path) => modeOf(await stat(join(root, path)))),
      );
      await storage.close();

      expect(modes).toEqual([0o700, 0o600, 0o600, 0o600]);
    },
  );

  it("opens a database given as an absolute path inside the repository", async () => {
    const root = await newRepository();

    const opened = await openSqliteStorage({ rootDir: root, path: join(root, "atium.db"), logger });
    await unwrap(opened).close();

    expect((await stat(join(root, "atium.db"))).isFile()).toBe(true);
  });

  it("rejects a directory that a symlink takes outside the repository", async () => {
    const root = await newRepository();
    const outside = await newRepository();
    // A junction is the directory link Windows lets anyone create.
    await symlink(outside, join(root, ".atium"), onPosix ? "dir" : "junction");

    expect(codeOf(await openSqliteStorage({ rootDir: root, logger }))).toBe("MODEL_INVALID");
  });

  it("rejects a database file that is a symlink", async ({ skip }) => {
    const root = await newRepository();
    await mkdir(join(root, ".atium"));
    await writeFile(join(root, "elsewhere.db"), "");
    let linked = true;
    try {
      await symlink(join(root, "elsewhere.db"), join(root, SQLITE_DATABASE_PATH));
    } catch (error) {
      // Windows only lets administrators and developer mode create file symlinks.
      if (onPosix) {
        throw error;
      }
      linked = false;
    }
    skip(!linked, "This Windows account cannot create file symlinks.");

    expect(codeOf(await openSqliteStorage({ rootDir: root, logger }))).toBe("MODEL_INVALID");
  });

  it("detects a run written through another connection to the same database", async () => {
    const root = await newRepository();
    const first = await openIn(root);
    const second = await openIn(root);
    const run = runAt(1, 0);

    unwrap(await first.writeRun(run));
    const repeated = await second.writeRun(run);
    unwrap(await second.writeRun(runAt(2, 1_000)));
    const listed = unwrap(await first.listRuns({ limit: 10 }));
    await Promise.all([first.close(), second.close()]);

    expect(codeOf(repeated)).toBe("STORAGE_CONFLICT");
    expect(listed.map(({ id }) => id)).toEqual([runAt(2, 1_000).id, run.id]);
  });

  it("rejects a path outside the repository with MODEL_INVALID", async () => {
    const root = await newRepository();

    const opened = await openSqliteStorage({ rootDir: root, path: "../outside.db", logger });

    expect(codeOf(opened)).toBe("MODEL_INVALID");
  });

  it("returns STORAGE_UNAVAILABLE when the path is a directory", async () => {
    const root = await newRepository();
    await mkdir(join(root, SQLITE_DATABASE_PATH), { recursive: true });

    expect(codeOf(await openSqliteStorage({ rootDir: root, logger }))).toBe("STORAGE_UNAVAILABLE");
  });

  it("returns STORAGE_UNAVAILABLE when the file is not a SQLite database", async () => {
    const root = await newRepository();
    await mkdir(join(root, ".atium"));
    await writeFile(join(root, SQLITE_DATABASE_PATH), "not a database, just text ".repeat(100));

    expect(codeOf(await openSqliteStorage({ rootDir: root, logger }))).toBe("STORAGE_UNAVAILABLE");
  });
});

describe("SQLite storage", () => {
  let root = "";
  let storage: Storage;

  beforeEach(async () => {
    root = await newRepository();
    storage = await openIn(root);
  });

  afterEach(async () => {
    await storage.close();
  });

  /** Runs `statement` on a second connection to the same database. */
  function execute(statement: string): void {
    const connection = connectTo(root);
    try {
      connection.exec(statement);
    } finally {
      connection.close();
    }
  }

  function query(statement: string): unknown[] {
    const connection = connectTo(root);
    try {
      return connection.prepare(statement).all();
    } finally {
      connection.close();
    }
  }

  describe("writeRun", () => {
    it("reads back a run with every optional field without adding or losing keys", async () => {
      const run = runWithEveryField();

      unwrap(await storage.writeRun(run));

      expect(unwrap(await storage.getRun(run.id))).toStrictEqual(run);
    });

    it("reads back a run without optional fields or results without adding keys", async () => {
      const run = runAt(1, 0);

      unwrap(await storage.writeRun(run));

      expect(unwrap(await storage.getRun(run.id))).toStrictEqual(run);
    });

    it("rejects a run that does not match the run schema and stores nothing", async () => {
      const run = structuredClone(runAt(1, 0));
      Reflect.set(run.environment.framework, "name", "mocha");

      const result = await storage.writeRun(run);

      expect(codeOf(result)).toBe("MODEL_INVALID");
      expect(unwrap(await storage.getRun(run.id))).toBeUndefined();
    });

    it("rejects a run with two results for the same test and stores nothing", async () => {
      const run = runAt(1, 0, aTestResult("checkout").passed(), aTestResult("checkout").passed());

      const result = await storage.writeRun(run);

      expect(codeOf(result)).toBe("MODEL_INVALID");
      expect(unwrap(await storage.getRun(run.id))).toBeUndefined();
    });

    it("rejects a result that repeats an attempt index", async () => {
      const built = runAt(1, 0, aTestResult("checkout").failedAllAttempts(2));
      const [result] = built.results;
      const run: Run = {
        ...built,
        results: result
          ? [{ ...result, attempts: result.attempts.map((attempt) => ({ ...attempt, index: 0 })) }]
          : [],
      };

      expect(codeOf(await storage.writeRun(run))).toBe("MODEL_INVALID");
      expect(unwrap(await storage.getRun(run.id))).toBeUndefined();
    });

    it("returns STORAGE_UNAVAILABLE when the database cannot be written", async () => {
      execute("DROP TABLE errors");

      const result = await storage.writeRun(
        runAt(1, 0, aTestResult("checkout").failedAllAttempts(1)),
      );

      expect(codeOf(result)).toBe("STORAGE_UNAVAILABLE");
      expect(result.ok ? undefined : result.error.cause).toBeInstanceOf(Error);
    });
  });

  describe("getRun and listRuns", () => {
    it("lists runs written after the same query ran before", async () => {
      unwrap(await storage.writeRun(runAt(1, 0)));
      const before = unwrap(await storage.listRuns({ since: runAt(1, 0).startedAt, limit: 10 }));
      unwrap(await storage.writeRun(runAt(2, 1_000)));

      const after = unwrap(await storage.listRuns({ since: runAt(1, 0).startedAt, limit: 10 }));

      expect([before.length, after.length]).toEqual([1, 2]);
    });

    it("reads back a result without attempts", async () => {
      const built = runAt(1, 0, aTestResult("checkout").passed());
      const run: Run = {
        ...built,
        results: built.results.map((result) => ({ ...result, attempts: [] })),
      };

      unwrap(await storage.writeRun(run));

      expect(unwrap(await storage.getRun(run.id))).toStrictEqual(run);
    });

    it("returns STORAGE_UNAVAILABLE when the database cannot be read", async () => {
      const run = runAt(1, 0, aTestResult("checkout").passed());
      unwrap(await storage.writeRun(run));
      execute("PRAGMA foreign_keys = OFF; DROP TABLE attempts");

      const result = await storage.getRun(run.id);

      expect(codeOf(result)).toBe("STORAGE_UNAVAILABLE");
      expect(result.ok ? undefined : result.error.cause).toBeInstanceOf(Error);
    });
  });

  describe("catalogs", () => {
    it("keeps each test with the identity of the latest run and the first and last time it was seen", async () => {
      const latest = runAt(1, 2_000, aTestResult("checkout").passed());
      const oldest = runAt(2, 0, aTestResult("checkout").passed());
      const latestWithTags: Run = withTags(latest, ["@new"]);
      const oldestWithTags: Run = withTags(oldest, ["@old"]);

      // Written out of order: the oldest run must not overwrite the latest identity.
      unwrap(await storage.writeRun(latestWithTags));
      unwrap(await storage.writeRun(oldestWithTags));

      expect(query("SELECT tags, first_seen_ms, last_seen_ms FROM test_cases")).toEqual([
        {
          tags: '["@new"]',
          first_seen_ms: Date.parse(oldest.startedAt),
          last_seen_ms: Date.parse(latest.startedAt),
        },
      ]);
    });

    it("keeps the first occurrence written of each error fingerprint as its sample", async () => {
      const first = failedRunAt(1, 0, "first message");
      const second = failedRunAt(2, 1_000, "second message");

      unwrap(await storage.writeRun(first));
      unwrap(await storage.writeRun(second));

      expect(query("SELECT sample_message FROM errors")).toEqual([
        { sample_message: "first message" },
      ]);
    });
  });

  describe("a damaged database", () => {
    it("returns MODEL_INVALID for a stored run that no longer matches the run schema", async () => {
      const run = runAt(1, 0);
      unwrap(await storage.writeRun(run));
      execute("UPDATE runs SET framework_name = 'mocha'");

      expect(codeOf(await storage.getRun(run.id))).toBe("MODEL_INVALID");
      expect(codeOf(await storage.listRuns({ limit: 10 }))).toBe("MODEL_INVALID");
    });

    it("returns MODEL_INVALID for a JSON column that does not parse", async () => {
      const run = runWithEveryField();
      unwrap(await storage.writeRun(run));
      execute(`UPDATE attempts SET network = '{"stored":' WHERE network IS NOT NULL`);

      const result = await storage.getRun(run.id);

      expect(codeOf(result)).toBe("MODEL_INVALID");
      // `JSON.parse` quotes the text it rejects; that is run data and stays out of the message.
      expect(result.ok ? "" : result.error.message).not.toContain("stored");
    });

    it("returns MODEL_INVALID for a truncation flag other than 1", async () => {
      const run = runAt(1, 0, aTestResult("checkout").passed());
      unwrap(await storage.writeRun(run));
      execute("UPDATE test_results SET detail_truncated = 2");

      expect(codeOf(await storage.getRun(run.id))).toBe("MODEL_INVALID");
    });

    it.each([
      ["a shard with only its index", "UPDATE runs SET ci_provider = 'github', ci_shard_index = 1"],
      ["CI columns without a provider", "UPDATE runs SET ci_provider = NULL, ci_job_id = 'e2e'"],
      [
        "a location with only its line",
        "UPDATE test_results SET location_line = 3, location_column = NULL",
      ],
    ])("returns MODEL_INVALID for %s", async (_, statement) => {
      const run = runAt(1, 0, aTestResult("checkout").passed());
      unwrap(await storage.writeRun(run));
      execute(statement);

      expect(codeOf(await storage.getRun(run.id))).toBe("MODEL_INVALID");
    });

    it("returns MODEL_INVALID for an attempt whose error lost a required column", async () => {
      const run = runAt(1, 0, aTestResult("checkout").failedAllAttempts(1));
      unwrap(await storage.writeRun(run));
      execute("UPDATE attempts SET error_message = NULL");

      expect(codeOf(await storage.getRun(run.id))).toBe("MODEL_INVALID");
    });
  });
});

function withTags(run: Run, tags: readonly string[]): Run {
  return {
    ...run,
    results: run.results.map((result) => ({ ...result, test: { ...result.test, tags } })),
  };
}

/** A run with one failed test whose error has `message`. */
function failedRunAt(seed: number, offsetMs: number, message: string): Run {
  const run = runAt(seed, offsetMs, aTestResult("checkout").failedAllAttempts(1));
  return {
    ...run,
    results: run.results.map((result) => ({
      ...result,
      attempts: result.attempts.map((attempt) => ({
        ...attempt,
        // Same fingerprint, different message: two occurrences of one error.
        error: anError().withMessage(message).with({ fingerprint: "0123456789abcdef" }).build(),
      })),
    })),
  };
}
