import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { RunId } from "../src/model/ids.js";
import type { Run } from "../src/model/run.js";
import type { Result } from "../src/result.js";
import type { Storage } from "../src/storage/storage.js";
import { fixedTimePlus } from "../src/testing/deterministic.js";
import { aRun } from "../src/testing/run-builder.js";
import { aTestResult } from "../src/testing/test-result-builder.js";
import { unwrap } from "../src/testing/unwrap.js";

const CONCURRENT_WRITERS = 50;
const SAME_ID_WRITERS = 10;
const ANY_LIMIT = 10;

/** Gives each `describe` block the storage of the running test. */
type CurrentStorage = () => Storage;

async function readStored(storage: Storage, id: RunId): Promise<Run> {
  const run = unwrap(await storage.getRun(id));
  if (run === undefined) {
    throw new Error(`Expected run ${id} to be stored, got undefined.`);
  }
  return run;
}

async function writeAll(storage: Storage, runs: readonly Run[]): Promise<void> {
  for (const run of runs) {
    unwrap(await storage.writeRun(run));
  }
}

/** A run with id derived from `seed`, started `offsetMs` after the fixed start. */
function runAt(seed: number, offsetMs: number, branch?: string): Run {
  const builder = aRun()
    .withSeed(seed)
    .with({ startedAt: fixedTimePlus(offsetMs), finishedAt: fixedTimePlus(offsetMs + 60_000) });
  return (
    branch === undefined
      ? builder
      : builder.with({ git: { commitSha: "3f2a9c1e5b7d", branch, dirty: false } })
  ).build();
}

function idsOf(runs: readonly Run[]): RunId[] {
  return runs.map((run) => run.id);
}

function byTextDescending(a: string, b: string): number {
  if (a === b) {
    return 0;
  }
  return a < b ? 1 : -1;
}

function codeOf(result: Result<unknown>): string {
  return result.ok ? "ok" : result.error.code;
}

function describeWriteAndGet(current: CurrentStorage): void {
  describe("writeRun and getRun", () => {
    it("reads back a run exactly as it was written", async () => {
      const run = aRun()
        .withSeed(1)
        .onProvider("github")
        .with({ git: { commitSha: "3f2a9c1e5b7d", branch: "main", dirty: false } })
        .withResult(aTestResult("checkout").failedThenPassed())
        .withResult(aTestResult("login").passed())
        .build();

      unwrap(await current().writeRun(run));

      expect(await readStored(current(), run.id)).toEqual(run);
    });

    it("returns undefined for a run that was never written", async () => {
      unwrap(await current().writeRun(runAt(1, 0)));

      expect(unwrap(await current().getRun(runAt(2, 0).id))).toBeUndefined();
    });

    it("keeps the stored run when the written or the read object is modified", async () => {
      const run = runAt(1, 0, "main");
      const written = structuredClone(run);
      unwrap(await current().writeRun(written));
      const read = await readStored(current(), run.id);

      // `Run` is readonly only in the types: JavaScript callers can still mutate it.
      Reflect.set(written.git, "branch", "changed-after-write");
      Reflect.set(read.git, "branch", "changed-after-read");

      expect(await readStored(current(), run.id)).toEqual(run);
    });

    it("rejects a run whose id is taken and keeps the stored one", async () => {
      const first = runAt(1, 0, "main");
      const second = runAt(1, 5_000, "feature");
      unwrap(await current().writeRun(first));

      const result = await current().writeRun(second);

      expect(codeOf(result)).toBe("STORAGE_CONFLICT");
      expect(await readStored(current(), first.id)).toEqual(first);
    });
  });
}

function describeListRunsOrder(current: CurrentStorage): void {
  describe("listRuns order", () => {
    it("lists runs from the most recent to the oldest", async () => {
      const second = runAt(1, 2_000);
      const oldest = runAt(2, 0);
      const latest = runAt(3, 3_000);
      const third = runAt(4, 1_000);
      await writeAll(current(), [second, oldest, latest, third]);

      const listed = unwrap(await current().listRuns({ limit: ANY_LIMIT }));

      expect(idsOf(listed)).toEqual(idsOf([latest, second, third, oldest]));
    });

    it("orders runs that started at the same instant by id, highest first", async () => {
      // The ids of seeds 1, 2 and 3 sort as 2, 3, 1: neither the order of
      // writing, nor its reverse, nor ascending.
      const runs = [runAt(1, 0), runAt(2, 0), runAt(3, 0)];
      await writeAll(current(), runs);

      const listed = unwrap(await current().listRuns({ limit: ANY_LIMIT }));

      expect(idsOf(listed)).toEqual(idsOf(runs).sort(byTextDescending));
    });

    it("compares start times as instants, not as text", async () => {
      // As text, "…00.500Z" sorts before "…00Z" although it is later.
      const whole = aRun().withSeed(1).with({ startedAt: "2026-10-08T14:03:00Z" }).build();
      const later = aRun().withSeed(2).with({ startedAt: "2026-10-08T14:03:00.500Z" }).build();
      await writeAll(current(), [whole, later]);

      const listed = unwrap(await current().listRuns({ limit: ANY_LIMIT }));

      expect(idsOf(listed)).toEqual([later.id, whole.id]);
    });

    it("returns only the most recent runs when there are more than the limit", async () => {
      const oldest = runAt(1, 0);
      const older = runAt(2, 1_000);
      const recent = runAt(3, 2_000);
      const latest = runAt(4, 3_000);
      await writeAll(current(), [oldest, older, recent, latest]);

      const listed = unwrap(await current().listRuns({ limit: 2 }));

      expect(idsOf(listed)).toEqual([latest.id, recent.id]);
    });

    it("returns an empty list when the storage is empty", async () => {
      expect(unwrap(await current().listRuns({ limit: ANY_LIMIT }))).toEqual([]);
    });
  });
}

function describeListRunsFilters(current: CurrentStorage): void {
  describe("listRuns filters", () => {
    it("returns only runs on the requested branch, leaving out runs without one", async () => {
      const onMain = runAt(1, 0, "main");
      const onFeature = runAt(2, 1_000, "feature/main");
      const withoutBranch = runAt(3, 2_000);
      const alsoOnMain = runAt(4, 3_000, "main");
      await writeAll(current(), [onMain, onFeature, withoutBranch, alsoOnMain]);

      const listed = unwrap(await current().listRuns({ branch: "main", limit: ANY_LIMIT }));

      expect(idsOf(listed)).toEqual([alsoOnMain.id, onMain.id]);
    });

    it("returns only runs that started at or after since", async () => {
      const before = runAt(1, 0);
      const atSince = runAt(2, 1_000);
      const after = runAt(3, 2_000);
      await writeAll(current(), [before, atSince, after]);

      const listed = unwrap(
        await current().listRuns({ since: fixedTimePlus(1_000), limit: ANY_LIMIT }),
      );

      expect(idsOf(listed)).toEqual([after.id, atSince.id]);
    });

    it("compares since as an instant, whatever its offset", async () => {
      const run = runAt(1, 0);
      unwrap(await current().writeRun(run));

      // The same instant as the run's start, written with an offset.
      const listed = unwrap(
        await current().listRuns({ since: "2026-10-08T16:03:00+02:00", limit: ANY_LIMIT }),
      );

      expect(idsOf(listed)).toEqual([run.id]);
    });

    it("applies branch, since and limit together", async () => {
      const oldOnMain = runAt(1, 0, "main");
      const recentOnFeature = runAt(2, 2_000, "feature");
      const recentOnMain = runAt(3, 3_000, "main");
      const latestOnMain = runAt(4, 4_000, "main");
      await writeAll(current(), [oldOnMain, recentOnFeature, recentOnMain, latestOnMain]);

      const listed = unwrap(
        await current().listRuns({ branch: "main", since: fixedTimePlus(1_000), limit: 1 }),
      );

      expect(idsOf(listed)).toEqual([latestOnMain.id]);
    });

    it("returns an empty list when no run matches", async () => {
      unwrap(await current().writeRun(runAt(1, 0, "main")));

      expect(unwrap(await current().listRuns({ branch: "release", limit: ANY_LIMIT }))).toEqual([]);
    });
  });
}

function describeListRunsInvalidQuery(current: CurrentStorage): void {
  describe("listRuns with an invalid query", () => {
    it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
      "rejects a limit of %s as a bug in the caller",
      async (limit) => {
        await expect(current().listRuns({ limit })).rejects.toThrow(RangeError);
      },
    );

    it.each([
      ["a text that is not a date", "yesterday"],
      ["a date that is not ISO 8601", "October 8, 2026"],
      ["a date-time without a zone", "2026-10-08T14:03:00"],
      ["a date without a time", "2026-10-08"],
    ])("rejects %s as since, as a bug in the caller", async (_, since) => {
      await expect(current().listRuns({ since, limit: ANY_LIMIT })).rejects.toThrow(RangeError);
    });
  });
}

function describeConcurrency(current: CurrentStorage): void {
  describe("concurrency", () => {
    it("keeps every run written by concurrent writers", async () => {
      const runs = Array.from({ length: CONCURRENT_WRITERS }, (_, index) =>
        runAt(index + 1, index * 1_000),
      );

      const results = await Promise.all(runs.map((run) => current().writeRun(run)));

      expect(results.map(codeOf)).toEqual(runs.map(() => "ok"));
      const listed = unwrap(await current().listRuns({ limit: CONCURRENT_WRITERS }));
      expect(idsOf(listed)).toEqual(idsOf(runs).reverse());
      for (const run of runs) {
        expect(await readStored(current(), run.id)).toEqual(run);
      }
    });

    it("accepts exactly one of several concurrent writes of the same id", async () => {
      const candidates = Array.from({ length: SAME_ID_WRITERS }, (_, index) =>
        runAt(1, index * 1_000),
      );

      const results = await Promise.all(candidates.map((run) => current().writeRun(run)));

      const winners = candidates.filter((_, index) => results[index]?.ok === true);
      const conflicts = results.filter((result) => codeOf(result) === "STORAGE_CONFLICT");
      expect(winners).toHaveLength(1);
      expect(conflicts).toHaveLength(SAME_ID_WRITERS - 1);
      expect([await readStored(current(), runAt(1, 0).id)]).toEqual(winners);
    });
  });
}

function describeClose(current: CurrentStorage): void {
  describe("close", () => {
    it("can be called more than once", async () => {
      await current().close();

      await expect(current().close()).resolves.toBeUndefined();
    });

    it("makes every operation fail with STORAGE_UNAVAILABLE", async () => {
      const run = runAt(1, 0);
      unwrap(await current().writeRun(run));
      await current().close();

      const results = [
        await current().writeRun(runAt(2, 0)),
        await current().getRun(run.id),
        await current().listRuns({ limit: ANY_LIMIT }),
      ];

      expect(results.map(codeOf)).toEqual([
        "STORAGE_UNAVAILABLE",
        "STORAGE_UNAVAILABLE",
        "STORAGE_UNAVAILABLE",
      ]);
    });

    it("still rejects an invalid query as a bug in the caller", async () => {
      await current().close();

      await expect(current().listRuns({ limit: 0 })).rejects.toThrow(RangeError);
    });
  });
}

/**
 * Behavior every storage backend must have. Each backend's tests call it with
 * a factory that returns a new, empty storage; the suite closes it after each
 * test.
 *
 * The runs used are well within the caps of ADR-0018, so backends that apply
 * them on write still read back what was written.
 *
 * @param create - Creates a new, empty storage.
 *
 * @example
 * ```ts
 * storageContract(() => Promise.resolve(new InMemoryStorage()));
 * ```
 */
export function storageContract(create: () => Promise<Storage>): void {
  describe("storage contract", () => {
    let storage: Storage | undefined;
    const current: CurrentStorage = () => {
      if (storage === undefined) {
        throw new Error("The storage contract used a storage outside of a test.");
      }
      return storage;
    };

    beforeEach(async () => {
      storage = await create();
    });

    afterEach(async () => {
      await current().close();
      storage = undefined;
    });

    describeWriteAndGet(current);
    describeListRunsOrder(current);
    describeListRunsFilters(current);
    describeListRunsInvalidQuery(current);
    describeConcurrency(current);
    describeClose(current);
  });
}
