import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ANALYZER_TIMEOUT_MS } from "../defaults.js";
import { compareFindings } from "../findings/compare.js";
import type { Analyzer } from "./analyzer.js";
import {
  analyzerReturning,
  baseContext,
  deferred,
  fakeAnalyzer,
  findingAt,
  flushEventLoop,
  gatedAnalyzer,
  openInOrder,
} from "./fakes.test-support.js";
import { runAnalyzers } from "./run-analyzers.js";

// Timeouts, failures, cancellation, concurrency and completion order of the
// orchestrator (fail-open, ADR-0006).

// Fixed seed, so a failure reproduces (04-testing.md, "Determinismo").
const runOptions = { seed: 20261013, numRuns: 50 };

describe("runAnalyzers", () => {
  describe("timeout", () => {
    it("skips with ANALYZER_TIMEOUT and a warning an analyzer that exceeds the timeout", async () => {
      const context = baseContext();
      const slow = fakeAnalyzer("slow", {
        analyze: async () => {
          // Time passes once "fast" has finished, so only this analyzer times out.
          await flushEventLoop();
          context.scheduler.advance(ANALYZER_TIMEOUT_MS);
          return deferred<never>().promise;
        },
      });
      const finding = findingAt("fast", "tests/a.spec.ts", 1);

      const result = await runAnalyzers([slow, analyzerReturning("fast", [finding])], context);

      const error: unknown = expect.objectContaining({
        name: "AtiumError",
        code: "ANALYZER_TIMEOUT",
        message: `Analyzer "slow" did not finish within ${String(ANALYZER_TIMEOUT_MS)} ms.`,
      });
      expect(result).toEqual({
        findings: [finding],
        skipped: [{ analyzer: "slow", reason: { kind: "timeout", error } }],
      });
      expect(context.logger.entries).toEqual([
        {
          level: "warn",
          message: "analyzer timed out; skipping it",
          context: { analyzer: "slow", error },
        },
      ]);
    });

    it("aborts the analyzer's signal with the timeout error as reason", async () => {
      const context = baseContext();
      const signals: AbortSignal[] = [];
      const slow = fakeAnalyzer("slow", {
        analyze: ({ signal }) => {
          signals.push(signal);
          context.scheduler.advance(10);
          return deferred<never>().promise;
        },
      });

      const result = await runAnalyzers([slow], { ...context, timeoutMs: 10 });

      const reasons = signals.map((signal): unknown => signal.reason);
      expect(signals.map((signal) => signal.aborted)).toEqual([true]);
      expect(reasons).toEqual([expect.objectContaining({ code: "ANALYZER_TIMEOUT" })]);
      expect(result.skipped).toEqual([
        { analyzer: "slow", reason: { kind: "timeout", error: reasons[0] } },
      ]);
    });

    it("keeps the findings of an analyzer that finishes just before the timeout", async () => {
      const context = baseContext();
      const finding = findingAt("slow", "tests/a.spec.ts", 1);
      const slow = fakeAnalyzer("slow", {
        analyze: () => {
          context.scheduler.advance(ANALYZER_TIMEOUT_MS - 1);
          return Promise.resolve([finding]);
        },
      });

      const result = await runAnalyzers([slow], context);

      expect(result).toEqual({ findings: [finding], skipped: [] });
    });

    it("cancels the timer of an analyzer that finished", async () => {
      const context = baseContext();

      await runAnalyzers([analyzerReturning("a", [])], context);

      expect(context.scheduler.pending).toBe(0);
    });

    it("counts the validation of the config in the timeout, and does not run the analyzer after it", async () => {
      const context = baseContext();
      const validated = deferred<boolean>();
      let calls = 0;
      const analyzer = fakeAnalyzer("slow-config", {
        configSchema: z.unknown().refine(() => validated.promise),
        analyze: () => {
          calls += 1;
          return Promise.resolve([]);
        },
      });

      const running = runAnalyzers([analyzer], context);
      await flushEventLoop();
      context.scheduler.advance(ANALYZER_TIMEOUT_MS);
      const result = await running;
      validated.resolve(true);
      await flushEventLoop();

      const error: unknown = expect.objectContaining({ code: "ANALYZER_TIMEOUT" });
      expect(result.skipped).toEqual([
        { analyzer: "slow-config", reason: { kind: "timeout", error } },
      ]);
      expect(calls).toBe(0);
    });
  });

  describe("fail-open", () => {
    it("skips with a warning an analyzer that rejects, and keeps the findings of the others", async () => {
      const context = baseContext();
      const error = new Error("index is corrupt");
      const finding = findingAt("ok", "tests/a.spec.ts", 1);

      const result = await runAnalyzers(
        [
          fakeAnalyzer("broken", { analyze: () => Promise.reject(error) }),
          analyzerReturning("ok", [finding]),
        ],
        context,
      );

      expect(result).toEqual({
        findings: [finding],
        skipped: [{ analyzer: "broken", reason: { kind: "failed", error } }],
      });
      expect(context.logger.entries).toEqual([
        {
          level: "warn",
          message: "analyzer failed; skipping it",
          context: { analyzer: "broken", error },
        },
      ]);
    });

    it("skips an analyzer that throws before returning a promise", async () => {
      const error = new TypeError("cannot read the index");
      const throwing = fakeAnalyzer("throwing", {
        analyze: () => {
          throw error;
        },
      });

      const result = await runAnalyzers([throwing], baseContext());

      expect(result.skipped).toEqual([{ analyzer: "throwing", reason: { kind: "failed", error } }]);
    });

    it("skips an analyzer that returns something other than an array", async () => {
      const odd = gatedAnalyzer("odd", Promise.resolve(), () => null as never);

      const result = await runAnalyzers([odd], baseContext());

      expect(result.skipped).toEqual([
        {
          analyzer: "odd",
          reason: {
            kind: "failed",
            error: new TypeError(`Analyzer "odd" returned null instead of an array of findings.`),
          },
        },
      ]);
    });
  });

  describe("cancellation", () => {
    it("skips every analyzer as aborted, without running them, when the signal is already aborted", async () => {
      const context = baseContext();
      const reason = new Error("interrupted");
      let calls = 0;
      const analyzer = fakeAnalyzer("a", {
        analyze: () => {
          calls += 1;
          return Promise.resolve([]);
        },
      });

      const result = await runAnalyzers([analyzer], {
        ...context,
        signal: AbortSignal.abort(reason),
      });

      expect(result.skipped).toEqual([
        { analyzer: "a", reason: { kind: "aborted", error: reason } },
      ]);
      expect(calls).toBe(0);
      expect(context.logger.entries).toEqual([]);
    });

    it("skips as aborted, and aborts its signal, an analyzer running when the analysis is cancelled", async () => {
      const controller = new AbortController();
      const reason = new Error("interrupted");
      const signals: AbortSignal[] = [];
      const analyzer = fakeAnalyzer("a", {
        analyze: ({ signal }) => {
          signals.push(signal);
          controller.abort(reason);
          return deferred<never>().promise;
        },
      });

      const result = await runAnalyzers([analyzer], {
        ...baseContext(),
        signal: controller.signal,
      });

      expect(result.skipped).toEqual([
        { analyzer: "a", reason: { kind: "aborted", error: reason } },
      ]);
      expect(signals.map((signal) => signal.reason as unknown)).toEqual([reason]);
    });

    it("skips as aborted, without running it, an analyzer cancelled while its config is validated", async () => {
      const controller = new AbortController();
      const reason = new Error("interrupted");
      const gate = deferred<boolean>();
      let calls = 0;
      const analyzer = fakeAnalyzer("a", {
        configSchema: z.unknown().refine(() => gate.promise),
        analyze: () => {
          calls += 1;
          return Promise.resolve([]);
        },
      });

      const running = runAnalyzers([analyzer], { ...baseContext(), signal: controller.signal });
      await flushEventLoop();
      controller.abort(reason);
      gate.resolve(true);
      const result = await running;
      await flushEventLoop();

      expect(result.skipped).toEqual([
        { analyzer: "a", reason: { kind: "aborted", error: reason } },
      ]);
      expect(calls).toBe(0);
    });
  });

  it("runs at most `concurrency` analyzers at the same time", async () => {
    const gates = [deferred<undefined>(), deferred<undefined>(), deferred<undefined>()] as const;
    const started: string[] = [];
    const gated = (id: string, gate: Promise<undefined>): Analyzer =>
      fakeAnalyzer(id, {
        analyze: async () => {
          started.push(id);
          await gate;
          return [];
        },
      });

    const running = runAnalyzers(
      [gated("a", gates[0].promise), gated("b", gates[1].promise), gated("c", gates[2].promise)],
      { ...baseContext(), concurrency: 2 },
    );
    await flushEventLoop();
    const startedBeforeRelease = [...started];
    await openInOrder(gates, [1, 0, 2]);
    await running;

    expect(startedBeforeRelease).toEqual(["a", "b"]);
    expect(started).toEqual(["a", "b", "c"]);
  });

  it("returns the same output whatever order the analyzers finish in", async () => {
    const failure = new Error("crashed");
    const findings = [
      findingAt("analyzer-0", "tests/b.spec.ts", 1),
      findingAt("analyzer-1", "tests/a.spec.ts", 4),
      findingAt("analyzer-1", "tests/a.spec.ts", 2),
      findingAt("analyzer-2", "tests/c.spec.ts", 1),
    ] as const;

    await fc.assert(
      fc.asyncProperty(
        fc.shuffledSubarray([0, 1, 2, 3], { minLength: 4, maxLength: 4 }),
        async (order) => {
          const context = baseContext();
          const gates = [
            deferred<undefined>(),
            deferred<undefined>(),
            deferred<undefined>(),
            deferred<undefined>(),
          ] as const;

          const running = runAnalyzers(
            [
              gatedAnalyzer("analyzer-0", gates[0].promise, () => [findings[0]]),
              gatedAnalyzer("analyzer-1", gates[1].promise, () => [
                findings[1],
                findings[2],
                { invalid: true },
              ]),
              gatedAnalyzer("analyzer-2", gates[2].promise, () => [findings[3]]),
              gatedAnalyzer("analyzer-3", gates[3].promise, () => {
                throw failure;
              }),
            ],
            { ...context, concurrency: 4 },
          );
          await openInOrder(gates, order);
          const result = await running;

          expect(result).toEqual({
            findings: [...findings].sort(compareFindings),
            skipped: [{ analyzer: "analyzer-3", reason: { kind: "failed", error: failure } }],
          });
          expect(context.logger.entries.map((entry) => entry.context?.["analyzer"])).toEqual([
            "analyzer-1",
            "analyzer-3",
          ]);
        },
      ),
      runOptions,
    );
  });
});
