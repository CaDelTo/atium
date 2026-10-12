import type { z } from "zod";
import { AttemptSchema } from "../model/attempt.js";
import type { Attempt } from "../model/attempt.js";
import { fixedTimePlus } from "./deterministic.js";
import { anError } from "./error-builder.js";
import type { ErrorBuilder } from "./error-builder.js";

type AttemptInput = z.input<typeof AttemptSchema>;
type AttemptPatch = Partial<Omit<AttemptInput, "error">>;

type AttemptState = Readonly<
  Omit<AttemptInput, "error" | "startedAt"> & {
    error: ErrorBuilder | undefined;
    startedAt: string | undefined;
  }
>;

/** Immutable builder of an {@link Attempt}. Every method returns a new builder. */
export interface AttemptBuilder {
  /**
   * Sets the index: 0 is the original try, 1..n are retries.
   *
   * @param index - Index of the attempt.
   * @returns A new builder with that index.
   */
  withIndex(index: number): AttemptBuilder;
  /**
   * Makes the attempt pass, without an error.
   *
   * @returns A new builder of a passed attempt.
   */
  passed(): AttemptBuilder;
  /**
   * Makes the attempt fail with an error.
   *
   * @param error - Builder of the error; `anError()` if omitted.
   * @returns A new builder of a failed attempt.
   */
  failed(error?: ErrorBuilder): AttemptBuilder;
  /**
   * Overrides any field of the attempt except `error`, which
   * {@link AttemptBuilder.failed} sets.
   *
   * @param patch - Fields to set. They are copied, so changing `patch`
   *   afterwards does not change the builder.
   * @returns A new builder with those fields.
   */
  with(patch: AttemptPatch): AttemptBuilder;
  /**
   * Builds the attempt, validated by {@link AttemptSchema}.
   *
   * @returns A frozen attempt. Unless set, `startedAt` is the fixed start
   *   plus `index × durationMs` of this attempt.
   * @throws `ZodError` if the fields set make the attempt invalid.
   */
  build(): Attempt;
}

function attemptBuilder(state: AttemptState): AttemptBuilder {
  return Object.freeze({
    withIndex: (index: number) => attemptBuilder({ ...state, index }),
    passed: () => attemptBuilder({ ...state, status: "passed", error: undefined }),
    failed: (error: ErrorBuilder = anError()) =>
      attemptBuilder({ ...state, status: "failed", error }),
    with: (patch: AttemptPatch) => attemptBuilder({ ...state, ...structuredClone(patch) }),
    build: () => {
      const { error, startedAt, ...fields } = state;
      return AttemptSchema.parse({
        ...fields,
        startedAt: startedAt ?? fixedTimePlus(fields.index * fields.durationMs),
        ...(error === undefined ? {} : { error: error.build() }),
      });
    },
  });
}

/**
 * Starts an {@link AttemptBuilder} of the original try that passed, with
 * valid, deterministic defaults.
 *
 * @example
 * ```ts
 * const retry = anAttempt().withIndex(1).failed(anError("AssertionError")).build();
 * ```
 *
 * @returns A builder of an attempt.
 */
export function anAttempt(): AttemptBuilder {
  return attemptBuilder({
    index: 0,
    status: "passed",
    startedAt: undefined,
    durationMs: 1000,
    error: undefined,
  });
}
