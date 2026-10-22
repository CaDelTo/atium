import { chmod, mkdir, mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RUNS_DIRECTORY } from "../defaults.js";
import type { Run } from "../model/run.js";
import { aRun, aTestResult, FakeLogger } from "../testing/index.js";
import { writeRunFile } from "./run-file-writer.js";

// Permission bits do not exist on Windows (15-storage.md §23.2.1).
const itPosix = it.skipIf(process.platform === "win32");

let rootDir: string;

beforeEach(async () => {
  rootDir = await mkdtemp(path.join(tmpdir(), "atium-run-modes-"));
});

afterEach(async () => {
  await rm(rootDir, { recursive: true, force: true });
});

/** Permission bits of `target`. */
async function modeOf(target: string): Promise<number> {
  return (await stat(target)).mode & 0o777;
}

function aRunWithOneResult(): Run {
  return aRun().withResult(aTestResult("passes").passed()).build();
}

describe("writeRunFile permissions", () => {
  itPosix("keeps the mode of an existing .atium directory and creates runs as 0o700", async () => {
    const atium = path.join(rootDir, ".atium");
    await mkdir(atium, { mode: 0o755 });
    await chmod(atium, 0o755);

    await writeRunFile(aRunWithOneResult(), { rootDir, logger: new FakeLogger() });

    expect(await modeOf(atium)).toBe(0o755);
    expect(await modeOf(path.join(atium, "runs"))).toBe(0o700);
  });

  itPosix("keeps the mode of an existing runs directory", async () => {
    const runs = path.join(rootDir, RUNS_DIRECTORY);
    await mkdir(runs, { recursive: true });
    await chmod(runs, 0o755);

    await writeRunFile(aRunWithOneResult(), { rootDir, logger: new FakeLogger() });

    expect(await modeOf(runs)).toBe(0o755);
  });
});
