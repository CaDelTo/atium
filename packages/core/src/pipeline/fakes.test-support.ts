import { z } from "zod";
import type { Finding } from "../findings/finding.js";
import { fingerprintOf } from "../findings/fingerprint-of.js";
import { FakeLogger, ManualScheduler } from "../testing/index.js";
import type { Analyzer } from "./analyzer.js";
import type { RunAnalyzersContext } from "./run-analyzers.js";

// Fakes for the orchestrator tests: analyzers with valid defaults, findings
// that differ only where the test says, and a promise settled by the test.

/** Fake analyzer: static, no requirements, empty config, no findings. */
export function fakeAnalyzer(id: string, overrides: Partial<Analyzer> = {}): Analyzer {
  return {
    id,
    version: "1",
    kind: "static",
    requires: [],
    configSchema: z.unknown(),
    analyze: () => Promise.resolve([]),
    ...overrides,
  };
}

/** Fake analyzer that returns the given findings, valid or not. */
export function analyzerReturning(id: string, findings: readonly unknown[]): Analyzer {
  // A third-party analyzer can return anything; the orchestrator validates it.
  return fakeAnalyzer(id, { analyze: () => Promise.resolve(findings as readonly Finding[]) });
}

/** Fake analyzer that waits for `gate` and then returns, or throws, what `outcome` gives. */
export function gatedAnalyzer(
  id: string,
  gate: Promise<unknown>,
  outcome: () => readonly unknown[] = () => [],
): Analyzer {
  return fakeAnalyzer(id, {
    analyze: async () => {
      await gate;
      // As in `analyzerReturning`, the findings may be invalid on purpose.
      return outcome() as readonly Finding[];
    },
  });
}

/** Valid finding of `analyzer` in `file` at `line`, with a fingerprint derived from both. */
export function findingAt(analyzer: string, file: string, line: number): Finding {
  return {
    fingerprint: fingerprintOf([analyzer, file, String(line)]),
    analyzer,
    ruleId: "TEST001",
    severity: "warning",
    category: "reliability",
    source: "rule",
    confidence: "high",
    message: "Something to fix.",
    location: { file, line },
  };
}

/** Context with a fresh logger and scheduler, and no capabilities. */
export function baseContext(): RunAnalyzersContext & {
  readonly logger: FakeLogger;
  readonly scheduler: ManualScheduler;
} {
  return { project: { root: "/repo" }, logger: new FakeLogger(), scheduler: new ManualScheduler() };
}

/** Promise the test settles from outside. */
export interface Deferred<T> {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
  readonly reject: (error: Error) => void;
}

/** Creates a {@link Deferred}. */
export function deferred<T>(): Deferred<T> {
  let settle: Omit<Deferred<T>, "promise"> | undefined;
  const promise = new Promise<T>((resolve, reject) => {
    settle = { resolve, reject };
  });
  if (settle === undefined) {
    throw new Error("Promise executors run synchronously.");
  }
  return { promise, ...settle };
}

/** Lets every pending callback and promise of the event loop run. */
export function flushEventLoop(): Promise<void> {
  return new Promise((resolve) => {
    setImmediate(resolve);
  });
}

/** Resolves `gates[i]` for each `i` of `order`, letting the event loop run between them. */
export async function openInOrder(
  gates: readonly Deferred<undefined>[],
  order: readonly number[],
): Promise<void> {
  for (const index of order) {
    await flushEventLoop();
    gates[index]?.resolve(undefined);
  }
}
