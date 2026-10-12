import {
  BDD_TRUNCATION_WINDOW_STEPS,
  RUN_FILE_LINE_TARGET_BYTES,
  RUN_FILE_READ_LIMITS,
} from "../defaults.js";
import type { Attempt } from "../model/attempt.js";
import type { BddContext } from "../model/bdd.js";
import type { NetworkSummary } from "../model/network.js";
import type { TestResult } from "../model/test-result.js";
import { bddReferenceIndex } from "./cap-run.js";

// Final guarantee of the writer (ADR-0018): a `TestResult` line over the
// target is trimmed step by step, in an order that keeps until the end the
// error of the first and last attempts, the endpoints and the failed BDD step.

/** A result and its serialized line. */
export interface FittedLine {
  /** The result as written: the input, or a trimmed copy marked `detailTruncated`. */
  readonly result: TestResult;
  /** `JSON.stringify(result)`, without the trailing `\n`. */
  readonly line: string;
}

/** Keeps `index`, `status`, `startedAt`, `durationMs` and the error without its stack. */
function minimalAttempt(attempt: Attempt): Attempt {
  const { index, status, startedAt, durationMs, error } = attempt;
  if (error === undefined) {
    return { index, status, startedAt, durationMs };
  }
  const { stack, ...errorWithoutStack } = error;
  return { index, status, startedAt, durationMs, error: errorWithoutStack };
}

/** Step 1: attempts other than the first and the last kept, to their minimal fields. */
function trimMiddleAttempts(result: TestResult): TestResult {
  const last = result.attempts.length - 1;
  return {
    ...result,
    attempts: result.attempts.map((attempt, position) =>
      position === 0 || position === last ? attempt : minimalAttempt(attempt),
    ),
  };
}

function withoutCalls(network: NetworkSummary): NetworkSummary {
  // `callsDropped` goes with `calls`: the counts only describe what the caps dropped.
  const { calls, callsDropped, ...rest } = network;
  return rest;
}

/** Step 2: `network.calls` of every attempt. The endpoints stay. */
function dropCalls(result: TestResult): TestResult {
  return {
    ...result,
    attempts: result.attempts.map((attempt) =>
      attempt.network === undefined
        ? attempt
        : { ...attempt, network: withoutCalls(attempt.network) },
    ),
  };
}

function withoutConsoleSamplesAndPageErrors(attempt: Attempt): Attempt {
  const { pageErrors, pageErrorsDropped, ...rest } = attempt;
  return rest.console === undefined ? rest : { ...rest, console: { ...rest.console, samples: [] } };
}

/** Step 3: console samples, keeping the `errors` and `warnings` counters, and `pageErrors`. */
function dropConsoleSamplesAndPageErrors(result: TestResult): TestResult {
  return { ...result, attempts: result.attempts.map(withoutConsoleSamplesAndPageErrors) };
}

function stepWindow(bdd: BddContext): BddContext {
  const reference = bddReferenceIndex(bdd.steps);
  const start = Math.max(0, reference - BDD_TRUNCATION_WINDOW_STEPS);
  return { ...bdd, steps: bdd.steps.slice(start, reference + BDD_TRUNCATION_WINDOW_STEPS + 1) };
}

/** Step 4: the reference BDD step and up to 10 steps before and 10 after it. */
function trimBddSteps(result: TestResult): TestResult {
  return result.bdd === undefined ? result : { ...result, bdd: stepWindow(result.bdd) };
}

/** Step 5: every attempt to its minimal fields. */
function trimAllAttempts(result: TestResult): TestResult {
  return { ...result, attempts: result.attempts.map(minimalAttempt) };
}

/** The steps of ADR-0018, "Garantía final del escritor", in order. */
const TRIM_STEPS: readonly ((result: TestResult) => TestResult)[] = [
  trimMiddleAttempts,
  dropCalls,
  dropConsoleSamplesAndPageErrors,
  trimBddSteps,
  trimAllAttempts,
];

function byteLength(line: string): number {
  return Buffer.byteLength(line, "utf8");
}

/** Sizes of {@link fitTestResultLine}, in UTF-8 bytes of the line without `\n`. */
export interface LineSizes {
  /** Size the trimming aims for: {@link RUN_FILE_LINE_TARGET_BYTES}. */
  readonly targetBytes: number;
  /** Size the reader accepts: the result line limit of {@link RUN_FILE_READ_LIMITS}. */
  readonly maxBytes: number;
}

const DEFAULT_LINE_SIZES: LineSizes = {
  targetBytes: RUN_FILE_LINE_TARGET_BYTES,
  maxBytes: RUN_FILE_READ_LIMITS.resultLineBytes,
};

/**
 * Serializes a capped result and, if the line is over
 * {@link RUN_FILE_LINE_TARGET_BYTES}, trims detail in the order of ADR-0018,
 * measuring again after each step, until it fits. A trimmed result is marked
 * `detailTruncated: true`; a result that fits is written as it is.
 *
 * With the caps of ADR-0018 applied first, the line always fits after the
 * last step (≈ 620 KiB at most).
 *
 * @param result - Result within the list and text caps.
 * @param sizes - Target and maximum sizes; tests make them small.
 * @returns The result as written and its line.
 * @throws Error if the line is still over the reader limit after every step:
 * a field was added to the model without revisiting the bound of ADR-0018.
 */
export function fitTestResultLine(result: TestResult, sizes: Partial<LineSizes> = {}): FittedLine {
  const { targetBytes, maxBytes } = { ...DEFAULT_LINE_SIZES, ...sizes };
  let current = result;
  let line = JSON.stringify(current);
  for (const trim of TRIM_STEPS) {
    if (byteLength(line) <= targetBytes) {
      break;
    }
    current = { ...trim(current), detailTruncated: true };
    line = JSON.stringify(current);
  }
  if (byteLength(line) > maxBytes) {
    // A broken invariant, not an expected failure: the writer must never
    // produce a line the reader rejects.
    throw new Error(
      `The line of test ${current.test.testId} takes ${String(byteLength(line))} bytes after every trimming step of ADR-0018, over the reader limit of ${String(maxBytes)}. A field of the model is probably missing from the size bound of ADR-0018; revisit it and the trimming steps.`,
    );
  }
  return { result: current, line };
}
