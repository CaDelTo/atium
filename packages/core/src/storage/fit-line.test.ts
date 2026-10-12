import { describe, expect, it } from "vitest";
import type { Attempt } from "../model/attempt.js";
import type { TestResult } from "../model/test-result.js";
import { fitTestResultLine } from "./fit-line.js";
import { call, endpoint, failedAttempt, resultWithSteps, step } from "./samples.test-support.js";

function bytesOf(result: TestResult): number {
  return Buffer.byteLength(JSON.stringify(result), "utf8");
}

/** Which kinds of detail a sample attempt carries. */
interface Detail {
  readonly calls: boolean;
  readonly consoleSamples: boolean;
  readonly pageErrors: boolean;
}

const ALL_DETAIL: Detail = { calls: true, consoleSamples: true, pageErrors: true };

/**
 * A failed attempt with a stack, network calls, console samples, page errors
 * and artifacts, minus the detail turned off. Without any of it, it is
 * `failedAttempt(index)` plus the stack, the endpoints, the console counters
 * and the trace.
 */
function detailedAttempt(index: number, detail: Detail = ALL_DETAIL): Attempt {
  const base = failedAttempt(index);
  return {
    ...base,
    ...(base.error === undefined
      ? {}
      : { error: { ...base.error, stack: "at checkout.spec.ts:12" } }),
    network: {
      endpoints: [endpoint("/api/cart")],
      ...(detail.calls ? { calls: [call(10, 5), call(20)], callsDropped: 4 } : {}),
    },
    console: { errors: 2, warnings: 1, samples: detail.consoleSamples ? ["warning: slow"] : [] },
    ...(detail.pageErrors
      ? { pageErrors: ["TypeError: x is undefined"], pageErrorsDropped: 1 }
      : {}),
    artifacts: { trace: "trace.zip" },
  };
}

describe("fitTestResultLine", () => {
  it("writes a result that fits as it is, without detailTruncated", () => {
    const result = resultWithSteps([step(0), step(1, "failed")]);

    const fitted = fitTestResultLine(result);

    expect(fitted.result).toBe(result);
    expect(fitted.line).toBe(JSON.stringify(result));
    expect(fitted.result).not.toHaveProperty("detailTruncated");
  });

  describe("trims in the order of ADR-0018 and stops as soon as the line fits", () => {
    const steps = Array.from({ length: 40 }, (_, position) =>
      step(position, position === 20 ? "failed" : "passed"),
    );
    const original: TestResult = {
      ...resultWithSteps(steps),
      attempts: [detailedAttempt(0), detailedAttempt(1), detailedAttempt(2)],
    };
    const noCalls: Detail = { ...ALL_DETAIL, calls: false };
    const noDetail: Detail = { calls: false, consoleSamples: false, pageErrors: false };

    // Minimal fields: `index`, `status`, `startedAt`, `durationMs` and the
    // error without its stack, which is exactly `failedAttempt(index)`.
    const afterStep1: TestResult = {
      ...original,
      attempts: [detailedAttempt(0), failedAttempt(1), detailedAttempt(2)],
      detailTruncated: true,
    };
    const afterStep2: TestResult = {
      ...afterStep1,
      attempts: [detailedAttempt(0, noCalls), failedAttempt(1), detailedAttempt(2, noCalls)],
    };
    const afterStep3: TestResult = {
      ...afterStep1,
      attempts: [detailedAttempt(0, noDetail), failedAttempt(1), detailedAttempt(2, noDetail)],
    };
    const afterStep4: TestResult = {
      ...afterStep3,
      bdd: { feature: "Checkout", scenario: "Pay", steps: steps.slice(10, 31) },
    };
    const afterStep5: TestResult = {
      ...afterStep4,
      attempts: [failedAttempt(0), failedAttempt(1), failedAttempt(2)],
    };

    it.each([
      ["1: the middle attempts to their minimal fields", afterStep1],
      ["2: the network calls and callsDropped, keeping the endpoints", afterStep2],
      ["3: the console samples, keeping the counters, and the page errors", afterStep3],
      ["4: the BDD steps around the reference", afterStep4],
      ["5: every attempt to its minimal fields", afterStep5],
    ])("step %s", (_label, expected) => {
      const fitted = fitTestResultLine(original, { targetBytes: bytesOf(expected) });

      expect(fitted.result).toEqual(expected);
      expect(fitted.line).toBe(JSON.stringify(expected));
    });

    it("measures the line after each step: every step makes it shorter", () => {
      const sizes = [original, afterStep1, afterStep2, afterStep3, afterStep4, afterStep5].map(
        bytesOf,
      );

      expect(sizes).toEqual([...sizes].sort((a, b) => b - a));
      expect(new Set(sizes).size).toBe(sizes.length);
    });

    it("applies every step and writes the result when it is still over the target", () => {
      expect(fitTestResultLine(original, { targetBytes: 0 }).result).toEqual(afterStep5);
    });

    it("fails as a bug when the line is still over the reader limit after every step", () => {
      expect(() =>
        fitTestResultLine(original, { targetBytes: 0, maxBytes: bytesOf(afterStep5) - 1 }),
      ).toThrow(/over the reader limit/);
    });
  });

  describe("BDD step window", () => {
    it.each([
      { where: "near the start", failedAt: 3, from: 0, to: 13 },
      { where: "near the end", failedAt: 36, from: 26, to: 39 },
    ])(
      "keeps the reference step and up to 10 on each side when it is $where",
      ({ failedAt, from, to }) => {
        const steps = Array.from({ length: 40 }, (_, position) =>
          step(position, position === failedAt ? "failed" : "passed"),
        );

        const fitted = fitTestResultLine(resultWithSteps(steps), { targetBytes: 0 });

        expect(fitted.result.bdd?.steps).toEqual(steps.slice(from, to + 1));
      },
    );

    it("takes the last step as the reference when every step passed", () => {
      const steps = Array.from({ length: 40 }, (_, position) => step(position));

      const fitted = fitTestResultLine(resultWithSteps(steps), { targetBytes: 0 });

      expect(fitted.result.bdd?.steps).toEqual(steps.slice(29));
    });
  });
});
