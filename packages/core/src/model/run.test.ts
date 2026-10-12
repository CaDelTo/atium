import { describe, expect, it } from "vitest";
import { FRAMEWORK_NAMES, RunSchema } from "./run.js";
import {
  fullRun,
  listOf,
  minimalAttempt,
  minimalResult,
  minimalRun,
  textOfBytes,
  without,
} from "./samples.test-support.js";

describe("RunSchema", () => {
  it.each([
    ["only the required fields", minimalRun()],
    ["every optional field", fullRun()],
    [
      "the last shard",
      { ...minimalRun(), ci: { provider: "github", shard: { index: 4, total: 4 } } },
    ],
    [
      "projects at their cap",
      { ...minimalRun(), frameworkConfig: { projects: listOf(100, textOfBytes(256)) } },
    ],
  ])("accepts a run with %s", (_label, input) => {
    expect(RunSchema.safeParse(input).success).toBe(true);
  });

  it.each(FRAMEWORK_NAMES)("accepts a run from framework %s", (name) => {
    const run = minimalRun();
    const input = { ...run, environment: { ...run.environment, framework: { name } } };

    expect(RunSchema.safeParse(input).success).toBe(true);
  });

  it.each([
    ["schemaVersion is missing", without(minimalRun(), "schemaVersion")],
    ["schemaVersion is not 1", { ...minimalRun(), schemaVersion: 2 }],
    ["id is not a UUID v7", { ...minimalRun(), id: "run-1" }],
    ["git is missing", without(minimalRun(), "git")],
    [
      "git.dirty is not a boolean",
      { ...minimalRun(), git: { commitSha: "3f2a9c1e", dirty: "no" } },
    ],
    [
      "the framework is not a known framework",
      {
        ...minimalRun(),
        environment: { ...minimalRun().environment, framework: { name: "jest" } },
      },
    ],
    ["ci has no provider", { ...minimalRun(), ci: { runId: "1" } }],
    ["runAttempt is 0", { ...minimalRun(), ci: { provider: "github", runAttempt: 0 } }],
    [
      "the shard index is 0",
      { ...minimalRun(), ci: { provider: "github", shard: { index: 0, total: 4 } } },
    ],
    [
      "the shard index is greater than the total",
      { ...minimalRun(), ci: { provider: "github", shard: { index: 5, total: 4 } } },
    ],
    [
      "projects has more than 100 items",
      { ...minimalRun(), frameworkConfig: { projects: listOf(101, "chromium") } },
    ],
    [
      "a project name is over 256 bytes",
      { ...minimalRun(), frameworkConfig: { projects: [textOfBytes(257)] } },
    ],
    ["workers is 0", { ...minimalRun(), frameworkConfig: { workers: 0 } }],
    ["finishedAt is not a date", { ...minimalRun(), finishedAt: "later" }],
    ["results is missing", without(minimalRun(), "results")],
    ["it has an unknown key", { ...minimalRun(), host: "ci-runner-1" }],
  ])("rejects a run when %s", (_label, input) => {
    expect(RunSchema.safeParse(input).success).toBe(false);
  });

  it("reports where a nested field is invalid", () => {
    const run = {
      ...minimalRun(),
      results: [{ ...minimalResult(), attempts: [{ ...minimalAttempt(), status: "retried" }] }],
    };

    const result = RunSchema.safeParse(run);

    expect(result.error?.issues.map((issue) => issue.path)).toEqual([
      ["results", 0, "attempts", 0, "status"],
    ]);
  });

  it("parses back to an equal run after a JSON round trip", () => {
    const run = RunSchema.parse(fullRun());

    const roundTripped = RunSchema.parse(JSON.parse(JSON.stringify(run)));

    expect(roundTripped).toEqual(run);
  });

  it("returns a frozen run, so its data cannot be changed in place", () => {
    const run = RunSchema.parse(fullRun());

    expect(Object.isFrozen(run)).toBe(true);
    expect(Object.isFrozen(run.results)).toBe(true);
    expect(Object.isFrozen(run.results[0]?.attempts[0])).toBe(true);
  });
});
