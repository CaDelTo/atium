import { MODEL_LIST_CAPS, MODEL_TEXT_CAPS_BYTES } from "../defaults.js";
import type { Attempt } from "../model/attempt.js";
import type { BddContext } from "../model/bdd.js";
import type { ErrorOccurrence } from "../model/error-occurrence.js";
import type { NetworkCall, NetworkSummary } from "../model/network.js";
import type { TestResult } from "../model/test-result.js";
import { jsonEscapedByteLength } from "../model/text.js";
import { anAttempt, anError, aTestCase, aTestResult } from "../testing/index.js";

// Inputs for the run file tests. Results over the caps cannot come from the
// builders, which validate, so they are built valid and then widened.

type NetworkEndpoint = NetworkSummary["endpoints"][number];
type BddStep = BddContext["steps"][number];

/**
 * Timeout of the tests on results with every field at its cap: capping,
 * validating and measuring them takes a few seconds on a slow CI runner or
 * next to the rest of the suite.
 */
export const HEAVY_TEST_TIMEOUT_MS = 60_000;

/** Moment the default error of `anError()` happens, from the start of the attempt. */
export const FAILED_AT_MS = 1000;

/**
 * Hard to measure: a control character written as `\u0001` (6 bytes), a
 * newline (2), 2-, 3- and 4-byte characters and a quote (2). 18 bytes.
 */
const TRICKY_UNIT = '\u0001\né€😀"a';

/**
 * String of exactly `bytes` bytes once escaped for JSON, full of control and
 * multibyte characters, with a 4-byte character right at the end when the
 * size allows it.
 */
export function trickyText(bytes: number, seed = ""): string {
  const head = `${seed}${TRICKY_UNIT.repeat(Math.floor(bytes / 18))}`;
  let text = head;
  while (jsonEscapedByteLength(text) > bytes - 4 && text.length > 0) {
    text = text.slice(0, -1);
  }
  const padding = "x".repeat(Math.max(0, bytes - 4 - jsonEscapedByteLength(text)));
  const result = bytes >= 4 ? `${text}${padding}😀` : "x".repeat(bytes);
  if (jsonEscapedByteLength(result) !== bytes) {
    throw new Error(
      `trickyText(${String(bytes)}) measured ${String(jsonEscapedByteLength(result))}`,
    );
  }
  return result;
}

/** The error of {@link failedAttempt}, built with the defaults. */
export function defaultError(): ErrorOccurrence {
  return anError().build();
}

/** A failed attempt built with the defaults, at `index`. */
export function failedAttempt(index = 0): Attempt {
  return anAttempt().withIndex(index).failed().build();
}

/** A result whose attempts are exactly `attempts`, possibly over the cap. */
export function resultWithAttempts(attempts: readonly Attempt[]): TestResult {
  return { ...aTestResult("capped").failedAllAttempts(1).build(), outcome: "failed", attempts };
}

/** A failed result with one attempt changed by `patch`. */
export function resultWithAttempt(patch: Partial<Attempt>): TestResult {
  return resultWithAttempts([{ ...failedAttempt(), ...patch }]);
}

/** A network call that started at `startedAtMs`; pending when `durationMs` is absent. */
export function call(startedAtMs: number, durationMs?: number): NetworkCall {
  return {
    method: "GET",
    urlTemplate: `/api/${String(startedAtMs)}`,
    host: "app.test",
    startedAtMs,
    ...(durationMs === undefined ? {} : { durationMs, status: 200 }),
  };
}

/** An endpoint with `count` calls and the given failures and statuses. */
export function endpoint(
  urlTemplate: string,
  fields: { count?: number; failures?: number; statuses?: Record<string, number> } = {},
): NetworkEndpoint {
  const count = fields.count ?? 1;
  return {
    method: "GET",
    urlTemplate,
    count,
    statuses: fields.statuses ?? { "200": count },
    failures: fields.failures ?? 0,
    p95Ms: 10,
  };
}

/** A BDD step named after its position. */
export function step(position: number, status = "passed"): BddStep {
  return { keyword: "Given ", text: `step ${String(position)}`, status, durationMs: 1 };
}

/** A failed result with BDD `steps`, possibly over the cap. */
export function resultWithSteps(steps: readonly BddStep[]): TestResult {
  return {
    ...resultWithAttempts([failedAttempt()]),
    bdd: { feature: "Checkout", scenario: "Pay", steps },
  };
}

/** An error with every field at its cap. */
function maxedError(seed: string): ErrorOccurrence {
  const text = (bytes: number): string => trickyText(bytes, seed);
  return {
    ...anError().build(),
    family: text(MODEL_TEXT_CAPS_BYTES.default),
    type: text(MODEL_TEXT_CAPS_BYTES.default),
    message: text(MODEL_TEXT_CAPS_BYTES.errorMessage),
    stack: text(MODEL_TEXT_CAPS_BYTES.errorStack),
    locator: text(MODEL_TEXT_CAPS_BYTES.default),
    matcher: {
      name: text(MODEL_TEXT_CAPS_BYTES.default),
      expected: text(MODEL_TEXT_CAPS_BYTES.matcherValue),
      actual: text(MODEL_TEXT_CAPS_BYTES.matcherValue),
    },
  };
}

/**
 * A failed attempt with every list and text at its cap, with control and
 * multibyte characters right at the limit.
 */
function maxedAttempt(index: number): Attempt {
  const seed = String(index);
  const text = (bytes: number): string => trickyText(bytes, seed);
  const longText = text(MODEL_TEXT_CAPS_BYTES.default);
  const maxedCall: NetworkCall = {
    method: longText,
    urlTemplate: longText,
    host: longText,
    status: 500,
    failure: longText,
    startedAtMs: 10,
    durationMs: 5,
    graphqlOperation: longText,
  };
  return {
    ...failedAttempt(index),
    error: maxedError(seed),
    network: {
      endpoints: Array.from({ length: MODEL_LIST_CAPS.networkEndpoints }, () => ({
        ...endpoint(longText),
        method: longText,
        statuses: { [longText]: 1 },
      })),
      calls: Array.from({ length: MODEL_LIST_CAPS.networkCalls }, () => maxedCall),
    },
    console: {
      errors: 9,
      warnings: 3,
      samples: Array.from({ length: MODEL_LIST_CAPS.consoleSamples }, () =>
        text(MODEL_TEXT_CAPS_BYTES.consoleSample),
      ),
    },
    pageErrors: Array.from({ length: MODEL_LIST_CAPS.pageErrors }, () =>
      text(MODEL_TEXT_CAPS_BYTES.pageError),
    ),
    artifacts: {
      trace: longText,
      screenshots: [longText],
      ariaSnapshot: longText,
      video: longText,
    },
  };
}

/** A failed result with `attempts` maxed attempts and every other field at its cap or over it. */
export function maxedResult(options: {
  attempts: number;
  steps?: number;
  tags?: number;
  titleLevels?: number;
}): TestResult {
  const longText = trickyText(MODEL_TEXT_CAPS_BYTES.default);
  const test = aTestCase("maxed").inProject("chromium").build();
  const steps = options.steps ?? 0;
  return {
    ...resultWithAttempts(
      Array.from({ length: options.attempts }, (_, index) => maxedAttempt(index)),
    ),
    test: {
      ...test,
      project: longText,
      file: longText,
      titlePath: Array.from({ length: options.titleLevels ?? 1 }, () => longText),
      tags: Array.from({ length: options.tags ?? 0 }, () => longText),
    },
    ...(steps === 0
      ? {}
      : {
          bdd: {
            feature: longText,
            scenario: longText,
            steps: Array.from({ length: steps }, (_, position) => ({
              keyword: longText,
              text: trickyText(MODEL_TEXT_CAPS_BYTES.bddStepText),
              // The reference step is in the middle, so the final window keeps 21 steps.
              status: position === Math.floor(steps / 2) ? longText : "passed",
              durationMs: 1,
              definition: trickyText(MODEL_TEXT_CAPS_BYTES.bddStepDefinition),
            })),
          },
        }),
  };
}
