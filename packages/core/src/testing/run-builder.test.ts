import { describe, expect, it } from "vitest";
import { RunSchema } from "../model/run.js";
import { FIXED_START } from "./deterministic.js";
import { aRun } from "./run-builder.js";
import { aTestResult } from "./test-result-builder.js";

describe("aRun", () => {
  it("builds a valid, frozen local run without results by default", () => {
    const run = aRun().build();

    expect(RunSchema.safeParse(run).success).toBe(true);
    expect(run.startedAt).toBe(FIXED_START);
    expect(run.results).toEqual([]);
    expect(run).not.toHaveProperty("ci");
    expect(Object.isFrozen(run)).toBe(true);
  });

  it("builds the same run every time", () => {
    const build = (): unknown =>
      aRun().onProvider("github").withResult(aTestResult("checkout").failedThenPassed()).build();

    expect(build()).toStrictEqual(build());
  });

  it("keeps the same id across processes", () => {
    // Golden value: catches a counter, a real clock or random bits in the defaults.
    expect(aRun().build().id).toBe("01a11bd3-1220-7325-bb97-585f5a4f2ff7");
  });

  it("derives a different id from each seed", () => {
    expect(aRun().withSeed(2).build().id).not.toBe(aRun().build().id);
    expect(aRun().withSeed(1).build().id).toBe(aRun().build().id);
  });

  it("sets the commit with `onCommit`", () => {
    expect(aRun().onCommit("abc123").build().git.commitSha).toBe("abc123");
  });

  it("adds the CI context with `onProvider` and keeps the rest of it", () => {
    const run = aRun()
      .with({ ci: { provider: "local", runId: "17" } })
      .onProvider("gitlab")
      .build();

    expect(aRun().onProvider("github").build().ci).toEqual({ provider: "github" });
    expect(run.ci).toEqual({ provider: "gitlab", runId: "17" });
  });

  it("adds results in order with `withResult`", () => {
    const run = aRun()
      .withResult(aTestResult("checkout").failedThenPassed())
      .withResult(aTestResult("login"))
      .build();

    expect(RunSchema.safeParse(run).success).toBe(true);
    expect(run.results.map((result) => [result.test.titlePath[0], result.outcome])).toEqual([
      ["checkout", "flaky"],
      ["login", "passed"],
    ]);
    expect(run.results[0]?.test.testId).not.toBe(run.results[1]?.test.testId);
  });

  it("builds a run that survives a JSON round trip unchanged", () => {
    const run = aRun()
      .onProvider("github")
      .withResult(aTestResult("checkout").failedAllAttempts(3))
      .build();

    expect(RunSchema.parse(JSON.parse(JSON.stringify(run)))).toStrictEqual(run);
  });

  it("is not changed by later changes to a patch given to `with`", () => {
    const git = { commitSha: "abc123", dirty: false };
    const builder = aRun().with({ git });

    git.commitSha = "def456";

    expect(builder.build().git.commitSha).toBe("abc123");
  });

  it("does not change the builder it was called on", () => {
    const original = aRun();
    const before = original.build();

    original.withSeed(2);
    original.onCommit("abc123");
    original.onProvider("github");
    original.withResult(aTestResult());
    original.with({ finishedAt: FIXED_START });

    expect(original.build()).toStrictEqual(before);
  });

  it("throws when the fields set make the run invalid", () => {
    expect(() =>
      aRun()
        .with({ ci: { provider: "github", shard: { index: 3, total: 2 } } })
        .build(),
    ).toThrow();
  });
});
