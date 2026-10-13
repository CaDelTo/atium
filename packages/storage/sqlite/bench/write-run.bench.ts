import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RunIdSchema } from "@atium/core";
import type { Run, Storage } from "@atium/core";
import { aRun, aTestResult, FakeLogger } from "@atium/core/testing";
import type { TestResultBuilder } from "@atium/core/testing";
import { afterAll, beforeAll, test } from "vitest";
import { openSqliteStorage } from "../src/index.js";

// Writing a run of 1,000 tests takes less than 1 s (task v0-16-storage-sqlite).
// The 5,000-test suite is the other size of 05-performance.md; it has no budget.
const BUDGET_MS = 1000;
const FILES = 50;

let root = "";
let storage: Storage;
let written = 0;

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), "atium-sqlite-bench-"));
  const opened = await openSqliteStorage({ rootDir: root, logger: new FakeLogger() });
  if (!opened.ok) {
    throw opened.error;
  }
  storage = opened.value;
});

afterAll(async () => {
  await storage.close();
  await rm(root, { recursive: true, force: true });
});

/** The i-th test of a synthetic suite: 90 % pass, 7 % are flaky and 3 % fail every retry. */
function syntheticResult(index: number): TestResultBuilder {
  const result = aTestResult(`test ${String(index)}`).inFile(
    `tests/area-${String(index % FILES)}.spec.ts`,
  );
  const bucket = index % 100;
  if (bucket < 3) {
    return result.failedAllAttempts(3);
  }
  return bucket < 10 ? result.failedThenPassed() : result.passed();
}

function syntheticRun(tests: number): Run {
  return Array.from({ length: tests }, (_, index) => syntheticResult(index))
    .reduce((builder, result) => builder.withResult(result), aRun().withSeed(1))
    .build();
}

/** `template` with a new id, since a stored run is never replaced. Only the id is parsed, so the measure is the write. */
function nextRun(template: Run): Run {
  written += 1;
  const id = `0199a1b2-0000-7000-8000-${written.toString(16).padStart(12, "0")}`;
  return { ...template, id: RunIdSchema.parse(id) };
}

async function writeOrThrow(run: Run): Promise<void> {
  const result = await storage.writeRun(run);
  if (!result.ok) {
    throw result.error;
  }
}

test("writeRun, 1,000 tests", async ({ bench }) => {
  const template = syntheticRun(1000);

  const result = await bench("one run of 1,000 tests", async () => {
    await writeOrThrow(nextRun(template));
  }).run();

  if (result.latency.mean >= BUDGET_MS) {
    throw new Error(
      `Writing a run of 1,000 tests took ${result.latency.mean.toFixed(0)} ms on average; the budget is ${String(BUDGET_MS)} ms.`,
    );
  }
});

test("writeRun, 5,000 tests", async ({ bench }) => {
  const template = syntheticRun(5000);

  await bench("one run of 5,000 tests", async () => {
    await writeOrThrow(nextRun(template));
  }).run();
});
