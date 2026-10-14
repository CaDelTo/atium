import { describe, expect, it } from "vitest";
import { z } from "zod";
import { InMemoryStorage } from "../testing/index.js";
import type { AnalysisContext, Analyzer } from "./analyzer.js";
import { analyzerReturning, baseContext, fakeAnalyzer, findingAt } from "./fakes.test-support.js";
import { runAnalyzers } from "./run-analyzers.js";

// Selection, config and output of the orchestrator. Timeouts, failures,
// cancellation and concurrency are in run-analyzers.resilience.test.ts.

describe("runAnalyzers", () => {
  it("returns the findings of every analyzer sorted with compareFindings", async () => {
    const context = baseContext();
    const first = findingAt("a", "tests/b.spec.ts", 3);
    const second = findingAt("a", "tests/a.spec.ts", 9);
    const third = findingAt("b", "tests/a.spec.ts", 2);

    const result = await runAnalyzers(
      [analyzerReturning("a", [first, second]), analyzerReturning("b", [third])],
      context,
    );

    expect(result).toEqual({ findings: [third, second, first], skipped: [] });
    expect(context.logger.entries).toEqual([]);
  });

  it("returns no findings and nothing skipped when there are no analyzers", async () => {
    expect(await runAnalyzers([], baseContext())).toEqual({
      findings: [],
      skipped: [],
    });
  });

  it("runs the first analyzer with a given id and skips the next ones with a warning", async () => {
    const context = baseContext();
    const finding = findingAt("lint", "tests/a.spec.ts", 1);

    const result = await runAnalyzers(
      [
        analyzerReturning("lint", [finding]),
        analyzerReturning("lint", [findingAt("lint", "tests/b.spec.ts", 2)]),
      ],
      context,
    );

    expect(result).toEqual({
      findings: [finding],
      skipped: [{ analyzer: "lint", reason: { kind: "duplicate-id" } }],
    });
    expect(context.logger.entries).toEqual([
      {
        level: "warn",
        message: "analyzer id is already registered; skipping the duplicate",
        context: { analyzer: "lint" },
      },
    ]);
  });

  it.each([
    ["timeoutMs", 0, 2 ** 31 - 1],
    ["timeoutMs", 1.5, 2 ** 31 - 1],
    // Longer than a timer accepts: Node would run it after 1 ms.
    ["timeoutMs", 2 ** 31, 2 ** 31 - 1],
    ["concurrency", 0, Number.MAX_SAFE_INTEGER],
    ["concurrency", Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER],
  ])("rejects with a RangeError when %s is %s", async (name, value, max) => {
    await expect(runAnalyzers([], { ...baseContext(), [name]: value })).rejects.toThrow(
      new RangeError(
        `runAnalyzers expects ${name} to be an integer from 1 to ${String(max)}, received ${String(value)}.`,
      ),
    );
  });

  it("does not treat history as available without storage, even if listed in capabilities", async () => {
    let calls = 0;
    const history = fakeAnalyzer("flaky", {
      requires: ["history"],
      analyze: () => {
        calls += 1;
        return Promise.resolve([]);
      },
    });

    const result = await runAnalyzers([history], {
      ...baseContext(),
      // A JavaScript caller is not stopped by the type.
      capabilities: ["history"] as never,
    });

    expect(result.skipped).toEqual([
      { analyzer: "flaky", reason: { kind: "missing-capabilities", missing: ["history"] } },
    ]);
    expect(calls).toBe(0);
  });

  describe("capabilities", () => {
    it("skips, without running it or warning, an analyzer whose requires are not available", async () => {
      const context = baseContext();
      let calls = 0;
      const analyzer = fakeAnalyzer("coverage-gaps", {
        requires: ["git", "coverage", "openapi", "coverage"],
        analyze: () => {
          calls += 1;
          return Promise.resolve([]);
        },
      });

      const result = await runAnalyzers([analyzer], {
        ...context,
        capabilities: ["git"],
      });

      expect(result.skipped).toEqual([
        {
          analyzer: "coverage-gaps",
          reason: {
            kind: "missing-capabilities",
            missing: ["coverage", "openapi"],
          },
        },
      ]);
      expect(calls).toBe(0);
      expect(context.logger.entries).toEqual([]);
    });

    it("runs an analyzer whose requires are all available", async () => {
      const finding = findingAt("network", "tests/a.spec.ts", 1);
      const analyzer = fakeAnalyzer("network", {
        requires: ["network", "dom"],
        analyze: () => Promise.resolve([finding]),
      });

      const result = await runAnalyzers([analyzer], {
        ...baseContext(),
        capabilities: ["dom", "network"],
      });

      expect(result).toEqual({ findings: [finding], skipped: [] });
    });

    it("treats history as available, and passes the storage, only when storage is given", async () => {
      const storage = new InMemoryStorage();
      const contexts: AnalysisContext[] = [];
      const history = fakeAnalyzer("flaky", {
        requires: ["history"],
        analyze: (context) => {
          contexts.push(context);
          return Promise.resolve([]);
        },
      });

      const withStorage = await runAnalyzers([history], {
        ...baseContext(),
        storage,
      });
      const withoutStorage = await runAnalyzers([history], baseContext());

      expect(withStorage.skipped).toEqual([]);
      expect(contexts.map((context) => context.storage)).toEqual([storage]);
      expect(withoutStorage.skipped).toEqual([
        {
          analyzer: "flaky",
          reason: { kind: "missing-capabilities", missing: ["history"] },
        },
      ]);
    });

    it("leaves storage out of the context when it is not given", async () => {
      const contexts: AnalysisContext[] = [];
      const analyzer = fakeAnalyzer("lint-crossfile", {
        analyze: (context) => {
          contexts.push(context);
          return Promise.resolve([]);
        },
      });

      await runAnalyzers([analyzer], baseContext());

      expect(contexts.map((context) => "storage" in context)).toEqual([false]);
    });
  });

  describe("invalid findings", () => {
    it("discards only the invalid findings and warns once per analyzer", async () => {
      const context = baseContext();
      const valid = findingAt("plugin", "tests/a.spec.ts", 1);

      const result = await runAnalyzers(
        [
          analyzerReturning("plugin", [
            { ...valid, fingerprint: "not-hex" },
            valid,
            { ...valid, location: { file: "tests/a.spec.ts", line: 0 } },
          ]),
        ],
        context,
      );

      const message: unknown = expect.stringMatching(
        /^Analyzer "plugin" returned 2 invalid finding\(s\); the first one has: "fingerprint": /,
      );
      const error: unknown = expect.objectContaining({
        name: "AtiumError",
        code: "MODEL_INVALID",
        message,
      });
      expect(result).toEqual({ findings: [valid], skipped: [] });
      expect(context.logger.entries).toEqual([
        {
          level: "warn",
          message: "analyzer returned invalid findings; discarding them",
          context: { analyzer: "plugin", discarded: 2, error },
        },
      ]);
    });
  });

  describe("config", () => {
    const limits = z.strictObject({ maxSteps: z.int().positive().default(20) });

    it("passes the analyzer its config section parsed with its configSchema", async () => {
      const maxSteps: number[] = [];
      // Typed config, as a plugin would write it: it must fit `readonly Analyzer[]`.
      const analyzer: Analyzer<z.infer<typeof limits>> = {
        id: "steps",
        version: "1",
        kind: "static",
        requires: [],
        configSchema: limits,
        analyze: ({ config }) => {
          maxSteps.push(config.maxSteps);
          return Promise.resolve([]);
        },
      };

      await runAnalyzers([analyzer], {
        ...baseContext(),
        configs: { steps: { maxSteps: 5 } },
      });

      expect(maxSteps).toEqual([5]);
    });

    it("parses {} when the section is absent, so the schema fills the defaults", async () => {
      const configs: unknown[] = [];
      const analyzer = fakeAnalyzer("toString", {
        configSchema: limits,
        analyze: ({ config }) => {
          configs.push(config);
          return Promise.resolve([]);
        },
      });

      await runAnalyzers([analyzer], { ...baseContext(), configs: {} });

      expect(configs).toEqual([{ maxSteps: 20 }]);
    });

    it("skips with CONFIG_INVALID and a warning, without running it, an analyzer with an invalid section", async () => {
      const context = baseContext();
      let calls = 0;
      const analyzer = fakeAnalyzer("steps", {
        configSchema: limits,
        analyze: () => {
          calls += 1;
          return Promise.resolve([]);
        },
      });

      const result = await runAnalyzers([analyzer], {
        ...context,
        configs: { steps: { maxSteps: "many" } },
      });

      const message: unknown = expect.stringMatching(
        /^Config section analyzers\."steps" is invalid: "maxSteps": /,
      );
      const error: unknown = expect.objectContaining({
        name: "AtiumError",
        code: "CONFIG_INVALID",
        message,
      });
      expect(result.skipped).toEqual([
        { analyzer: "steps", reason: { kind: "invalid-config", error } },
      ]);
      expect(calls).toBe(0);
      expect(context.logger.entries).toEqual([
        {
          level: "warn",
          message: "analyzer config is invalid; skipping the analyzer",
          context: { analyzer: "steps", error },
        },
      ]);
    });

    it("skips as failed an analyzer whose configSchema throws", async () => {
      const error = new Error("refinement crashed");
      const analyzer = fakeAnalyzer("steps", {
        configSchema: z.unknown().refine(() => {
          throw error;
        }),
      });

      const result = await runAnalyzers([analyzer], baseContext());

      expect(result.skipped).toEqual([{ analyzer: "steps", reason: { kind: "failed", error } }]);
    });
  });
});
