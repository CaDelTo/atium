import type { z } from "zod";
import { RunSchema, SCHEMA_VERSION } from "../model/run.js";
import type { Run } from "../model/run.js";
import { FIXED_START, fixedTimePlus, seededRunId } from "./deterministic.js";
import type { TestResultBuilder } from "./test-result-builder.js";

type RunInput = z.input<typeof RunSchema>;
type RunPatch = Partial<Omit<RunInput, "results">>;

type RunState = Readonly<Omit<RunInput, "results"> & { results: readonly TestResultBuilder[] }>;

/** Immutable builder of a {@link Run}. Every method returns a new builder. */
export interface RunBuilder {
  /**
   * Derives the run id from a seed, so tests can build several runs with
   * different ids.
   *
   * @param seed - Any number; the same seed always gives the same id.
   * @returns A new builder with a UUID v7 derived from `seed`.
   */
  withSeed(seed: number): RunBuilder;
  /**
   * Sets the commit tested.
   *
   * @param sha - Value of `git.commitSha`.
   * @returns A new builder on that commit.
   */
  onCommit(sha: string): RunBuilder;
  /**
   * Sets the CI provider, adding the `ci` context if the run had none.
   *
   * @param name - Provider, such as `github`, `gitlab` or `local`.
   * @returns A new builder on that provider.
   */
  onProvider(name: string): RunBuilder;
  /**
   * Adds a result after the existing ones.
   *
   * @param result - Builder of the result.
   * @returns A new builder with that result added.
   */
  withResult(result: TestResultBuilder): RunBuilder;
  /**
   * Overrides any field of the run except `results`, which
   * {@link RunBuilder.withResult} adds.
   *
   * @param patch - Fields to set. They are copied, so changing `patch`
   *   afterwards does not change the builder.
   * @returns A new builder with those fields.
   */
  with(patch: RunPatch): RunBuilder;
  /**
   * Builds the run, validated by {@link RunSchema}.
   *
   * @returns A frozen run.
   * @throws `ZodError` if the fields set make the run invalid.
   */
  build(): Run;
}

function runBuilder(state: RunState): RunBuilder {
  return Object.freeze({
    withSeed: (seed: number) => runBuilder({ ...state, id: seededRunId(seed) }),
    onCommit: (sha: string) => runBuilder({ ...state, git: { ...state.git, commitSha: sha } }),
    onProvider: (name: string) => runBuilder({ ...state, ci: { ...state.ci, provider: name } }),
    withResult: (result: TestResultBuilder) =>
      runBuilder({ ...state, results: [...state.results, result] }),
    with: (patch: RunPatch) => runBuilder({ ...state, ...structuredClone(patch) }),
    build: () =>
      RunSchema.parse({ ...state, results: state.results.map((result) => result.build()) }),
  });
}

/**
 * Starts a {@link RunBuilder} of a run without results and without `ci`
 * context, with valid, deterministic defaults: a fixed start and an id
 * derived from seed 1.
 *
 * @example
 * ```ts
 * const run = aRun()
 *   .onCommit("abc123")
 *   .withResult(aTestResult("checkout").failedThenPassed())
 *   .build();
 * ```
 *
 * @returns A builder of a run.
 */
export function aRun(): RunBuilder {
  return runBuilder({
    schemaVersion: SCHEMA_VERSION,
    id: seededRunId(1),
    git: { commitSha: "3f2a9c1e5b7d4a6f8e0c2b4d6a8f1e3c5b7d9a0f", dirty: false },
    environment: {
      os: "linux",
      arch: "x64",
      nodeVersion: "22.20.0",
      framework: { name: "playwright" },
    },
    startedAt: FIXED_START,
    finishedAt: fixedTimePlus(150_000),
    results: [],
  });
}
