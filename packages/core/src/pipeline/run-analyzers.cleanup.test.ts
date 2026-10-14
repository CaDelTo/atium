import { getEventListeners } from "node:events";
import { describe, expect, it } from "vitest";
import type { Finding } from "../findings/finding.js";
import {
  analyzerReturning,
  baseContext,
  deferred,
  fakeAnalyzer,
  findingAt,
  flushEventLoop,
} from "./fakes.test-support.js";
import { runAnalyzers } from "./run-analyzers.js";

// What happens after an analyzer loses the race against its timeout or the
// cancellation: the queue moves on, late results are ignored and nothing is
// left behind.

describe("runAnalyzers after an analyzer times out", () => {
  it("frees its slot, so the next analyzer in the queue runs", async () => {
    const context = baseContext();
    const finding = findingAt("next", "tests/a.spec.ts", 1);
    const stuck = fakeAnalyzer("stuck", {
      analyze: () => {
        context.scheduler.advance(10);
        return deferred<never>().promise;
      },
    });

    const result = await runAnalyzers([stuck, analyzerReturning("next", [finding])], {
      ...context,
      timeoutMs: 10,
      concurrency: 1,
    });

    expect(result.findings).toEqual([finding]);
    expect(result.skipped.map((skipped) => skipped.reason.kind)).toEqual(["timeout"]);
  });

  it("ignores a late rejection, without a warning or an unhandled rejection", async () => {
    const context = baseContext();
    const late = deferred<readonly Finding[]>();
    const stuck = fakeAnalyzer("stuck", {
      analyze: () => {
        context.scheduler.advance(10);
        return late.promise;
      },
    });

    const result = await runAnalyzers([stuck], { ...context, timeoutMs: 10 });
    late.reject(new Error("gave up after the abort"));
    await flushEventLoop();

    expect(result.skipped.map((skipped) => skipped.reason.kind)).toEqual(["timeout"]);
    expect(context.logger.entries.map((entry) => entry.message)).toEqual([
      "analyzer timed out; skipping it",
    ]);
  });

  it("ignores late findings", async () => {
    const context = baseContext();
    const late = deferred<readonly Finding[]>();
    const stuck = fakeAnalyzer("stuck", {
      analyze: () => {
        context.scheduler.advance(10);
        return late.promise;
      },
    });

    const result = await runAnalyzers([stuck], { ...context, timeoutMs: 10 });
    late.resolve([findingAt("stuck", "tests/a.spec.ts", 1)]);
    await flushEventLoop();

    expect(result.findings).toEqual([]);
    expect(context.logger.entries).toHaveLength(1);
  });
});

describe("runAnalyzers with a cancellation signal", () => {
  it("removes its abort listeners once every analyzer has finished", async () => {
    const controller = new AbortController();

    await runAnalyzers([analyzerReturning("a", []), analyzerReturning("b", [])], {
      ...baseContext(),
      signal: controller.signal,
    });

    expect(getEventListeners(controller.signal, "abort")).toEqual([]);
  });

  it("removes its abort listener when an analyzer times out", async () => {
    const context = baseContext();
    const controller = new AbortController();
    const stuck = fakeAnalyzer("stuck", {
      analyze: () => {
        context.scheduler.advance(10);
        return deferred<never>().promise;
      },
    });

    await runAnalyzers([stuck], { ...context, timeoutMs: 10, signal: controller.signal });

    expect(getEventListeners(controller.signal, "abort")).toEqual([]);
  });
});
