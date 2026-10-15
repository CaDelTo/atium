import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { MODEL_LIST_CAPS, MODEL_TEXT_CAPS_BYTES } from "../defaults.js";
import type { NetworkCall } from "../model/network.js";
import { RunSchema } from "../model/run.js";
import { TestResultSchema } from "../model/test-result.js";
import { jsonEscapedByteLength } from "../model/text.js";
import { aRun, aTestCase, aTestResult } from "../testing/index.js";
import { HEAVY_TEST_TIMEOUT_MS } from "../testing/timeouts.js";
import { bddReferenceIndex, capRunHeader, capTestResult } from "./cap-run.js";
import {
  call,
  defaultError,
  endpoint,
  FAILED_AT_MS,
  failedAttempt,
  maxedResult,
  resultWithAttempt,
  resultWithAttempts,
  resultWithSteps,
  step,
  trickyText,
} from "./samples.test-support.js";

// Fixed seed, so a failure reproduces (04-testing.md, "Determinismo").
const runOptions = { seed: 20261012, numRuns: 300 };

const ANSI_RED = "\u001b[31m";
const ANSI_RESET = "\u001b[0m";
// eslint-disable-next-line no-control-regex -- the test looks for the escape character itself
const ANSI_ESCAPE = /\u001b\[/;

/** Rank of an item for a cap: lower ranks first, compared field by field. */
type RankKey = readonly number[];

function compareKeys(a: RankKey, b: RankKey): number {
  for (const [position, value] of a.entries()) {
    const difference = value - (b[position] ?? 0);
    if (difference !== 0) {
      return difference;
    }
  }
  return 0;
}

/** Every kept item ranks before every dropped one: the worst kept beats the best dropped. */
function expectKeptOutrankDropped(kept: readonly RankKey[], dropped: readonly RankKey[]): void {
  const [firstKept, ...restKept] = kept;
  const [firstDropped, ...restDropped] = dropped;
  if (firstKept === undefined || firstDropped === undefined) {
    return;
  }
  const worstKept = restKept.reduce(
    (worst, key) => (compareKeys(key, worst) > 0 ? key : worst),
    firstKept,
  );
  const bestDropped = restDropped.reduce(
    (best, key) => (compareKeys(key, best) < 0 ? key : best),
    firstDropped,
  );
  expect(compareKeys(worstKept, bestDropped)).toBeLessThan(0);
}

describe("capTestResult", () => {
  it("returns a result within the caps unchanged", () => {
    const result = aTestResult("checkout").failedThenPassed().build();

    expect(capTestResult(result)).toEqual(result);
  });

  describe("attempts", () => {
    it("keeps the first and the last 19, with their original index and attemptsDropped", () => {
      const attempts = Array.from({ length: 25 }, (_, index) => failedAttempt(index));

      const capped = capTestResult(resultWithAttempts(attempts));

      expect(capped.attempts.map((attempt) => attempt.index)).toEqual([
        0,
        ...Array.from({ length: 19 }, (_, offset) => 6 + offset),
      ]);
      expect(capped.attemptsDropped).toBe(5);
    });

    it("adds what it drops to an attemptsDropped already present", () => {
      const attempts = Array.from({ length: 21 }, (_, index) => failedAttempt(index));

      const capped = capTestResult({ ...resultWithAttempts(attempts), attemptsDropped: 3 });

      expect(capped.attemptsDropped).toBe(4);
    });

    it("omits attemptsDropped when nothing is dropped", () => {
      expect(capTestResult(resultWithAttempts([failedAttempt()]))).not.toHaveProperty(
        "attemptsDropped",
      );
    });
  });

  describe("test case", () => {
    it("keeps the first 50 tags and the first and last 19 levels of titlePath, without counts", () => {
      const base = aTestResult("capped").build();
      const tags = Array.from({ length: 60 }, (_, index) => `@tag${String(index)}`);
      const titlePath = Array.from({ length: 25 }, (_, index) => `level ${String(index)}`);

      const capped = capTestResult({ ...base, test: { ...base.test, tags, titlePath } });

      expect(capped.test.tags).toEqual(tags.slice(0, 50));
      expect(capped.test.titlePath).toEqual([titlePath[0], ...titlePath.slice(6)]);
    });

    // Slow next to the rest of the suite: room on a loaded CI runner (#99).
    it(
      "keeps the testId computed from the original values when titlePath and file are capped",
      () => {
        const test = aTestCase("checkout").build();
        const titlePath = Array.from({ length: 30 }, () => trickyText(3000));
        const original = {
          ...aTestResult("checkout").build(),
          test: { ...test, titlePath, file: trickyText(5000) },
        };

        const capped = capTestResult(original);

        expect(capped.test.testId).toBe(test.testId);
        expect(capped.test.titlePath).toHaveLength(MODEL_LIST_CAPS.titlePathLevels);
      },
      HEAVY_TEST_TIMEOUT_MS,
    );
  });

  describe("network calls", () => {
    it("keeps calls pending at the failure even when other calls are closer to it", () => {
      const pending = [call(0), call(1, 5000)];
      const close = Array.from({ length: 250 }, (_, offset) => call(FAILED_AT_MS - 50 + offset, 1));
      const calls = [...pending, ...close];

      const capped = capTestResult(resultWithAttempt({ network: { endpoints: [], calls } }));

      const network = capped.attempts[0]?.network;
      expect(network?.calls).toHaveLength(MODEL_LIST_CAPS.networkCalls);
      expect(network?.calls?.slice(0, 2)).toEqual(pending);
      expect(network?.callsDropped).toBe(calls.length - MODEL_LIST_CAPS.networkCalls);
    });

    it("uses the end of the attempt as the reference when it has no error", () => {
      const { error, ...attempt } = failedAttempt();
      const calls = Array.from({ length: 300 }, (_, index) => call(index * 10, 1));

      const capped = capTestResult(
        resultWithAttempts([
          { ...attempt, status: "passed", durationMs: 3000, network: { endpoints: [], calls } },
        ]),
      );

      // The 200 calls closest to 3000 ms: from 1000 ms to 2990 ms.
      expect(capped.attempts[0]?.network?.calls?.[0]?.startedAtMs).toBe(1000);
      expect(capped.attempts[0]?.network?.calls?.at(-1)?.startedAtMs).toBe(2990);
    });

    it("on a tie of distance, keeps the call before the reference", () => {
      const calls = [
        ...Array.from({ length: 199 }, () => call(FAILED_AT_MS, 0)),
        call(FAILED_AT_MS + 10, 1),
        call(FAILED_AT_MS - 10, 1),
      ];

      const capped = capTestResult(resultWithAttempt({ network: { endpoints: [], calls } }));

      expect(capped.attempts[0]?.network?.calls?.at(-1)?.startedAtMs).toBe(FAILED_AT_MS - 10);
    });

    it("keeps the 200 pending calls closest to the failure when more than 200 are pending", () => {
      // 250 calls pending at the failure, started from 0 to 249 ms, plus a
      // call that starts just after it: closer, but not pending.
      const pending = Array.from({ length: 250 }, (_, index) => call(index));
      const calls = [...pending, call(FAILED_AT_MS + 1, 1)];

      const capped = capTestResult(resultWithAttempt({ network: { endpoints: [], calls } }));

      expect(capped.attempts[0]?.network?.calls).toEqual(pending.slice(50));
      expect(capped.attempts[0]?.network?.callsDropped).toBe(51);
    });

    const callArbitrary = fc
      .record({
        startedAtMs: fc.integer({ min: 0, max: 2000 }),
        durationMs: fc.option(fc.integer({ min: 0, max: 1500 }), { nil: undefined }),
      })
      .map(({ startedAtMs, durationMs }) => call(startedAtMs, durationMs));

    // Slow next to the rest of the suite: room on a loaded CI runner (#99).
    it(
      "keeps pending calls first, then the closest to the failure, in their original order",
      () => {
        fc.assert(
          fc.property(fc.array(callArbitrary, { minLength: 190, maxLength: 260 }), (calls) => {
            const tagged = calls.map((item, index) => ({ ...item, host: `h${String(index)}` }));
            const capped = capTestResult(
              resultWithAttempt({ network: { endpoints: [], calls: tagged } }),
            );
            const network = capped.attempts[0]?.network;
            const kept = network?.calls ?? [];
            const keptHosts = new Set(kept.map((item) => item.host));
            const dropped = tagged.filter((item) => !keptHosts.has(item.host));
            const isPending = (item: NetworkCall): boolean =>
              item.startedAtMs <= FAILED_AT_MS &&
              (item.durationMs === undefined || item.startedAtMs + item.durationMs > FAILED_AT_MS);
            const distance = (item: NetworkCall): number =>
              Math.abs(item.startedAtMs - FAILED_AT_MS);
            const order = kept.map((item) => Number(item.host.slice(1)));

            expect(kept).toHaveLength(Math.min(calls.length, MODEL_LIST_CAPS.networkCalls));
            expect(network?.callsDropped).toBe(dropped.length > 0 ? dropped.length : undefined);
            expect(order).toEqual([...order].sort((a, b) => a - b));
            const rank = (item: NetworkCall): RankKey => [
              isPending(item) ? 0 : 1,
              distance(item),
              item.startedAtMs > FAILED_AT_MS ? 1 : 0,
              Number(item.host.slice(1)),
            ];
            expectKeptOutrankDropped(kept.map(rank), dropped.map(rank));
          }),
          runOptions,
        );
      },
      HEAVY_TEST_TIMEOUT_MS,
    );
  });

  describe("network endpoints", () => {
    it("keeps endpoints with failures first, then the busiest, in their original order", () => {
      const quiet = Array.from({ length: 205 }, (_, index) =>
        endpoint(`/quiet/${String(index)}`, { count: 1 }),
      );
      const busy = endpoint("/busy", { count: 50 });
      const failing = endpoint("/failing", { failures: 1 });
      const notFound = endpoint("/missing", { statuses: { "404": 1 } });
      const endpoints = [failing, ...quiet, busy, notFound];

      const capped = capTestResult(resultWithAttempt({ network: { endpoints } }));
      const kept = capped.attempts[0]?.network?.endpoints ?? [];

      expect(kept).toHaveLength(MODEL_LIST_CAPS.networkEndpoints);
      expect(kept[0]).toEqual(failing);
      expect(kept.slice(-2)).toEqual([busy, notFound]);
      // The quiet endpoints tie on count: the lowest indexes stay.
      expect(kept.slice(1, -2)).toEqual(quiet.slice(0, 197));
      expect(capped.attempts[0]?.network?.endpointsDropped).toBe(8);
    });

    it("adds up the counts of status codes that become equal when truncated", () => {
      const prefix = "5".repeat(MODEL_TEXT_CAPS_BYTES.default);
      const capped = capTestResult(
        resultWithAttempt({
          network: {
            endpoints: [endpoint("/a", { statuses: { [`${prefix}0`]: 2, [`${prefix}1`]: 3 } })],
          },
        }),
      );

      expect(capped.attempts[0]?.network?.endpoints[0]?.statuses).toEqual({ [prefix]: 5 });
    });
  });

  describe("page errors and console samples", () => {
    it("keeps the last 20 page errors and the last 5 console samples", () => {
      const pageErrors = Array.from({ length: 30 }, (_, index) => `error ${String(index)}`);
      const samples = Array.from({ length: 8 }, (_, index) => `sample ${String(index)}`);

      const capped = capTestResult(
        resultWithAttempt({ pageErrors, console: { errors: 8, warnings: 0, samples } }),
      );

      expect(capped.attempts[0]?.pageErrors).toEqual(pageErrors.slice(10));
      expect(capped.attempts[0]?.pageErrorsDropped).toBe(10);
      expect(capped.attempts[0]?.console).toEqual({
        errors: 8,
        warnings: 0,
        samples: samples.slice(3),
      });
    });

    it("removes ANSI codes from message, stack, console samples and page errors", () => {
      const colored = `${ANSI_RED}boom${ANSI_RESET}`;

      const capped = capTestResult(
        resultWithAttempt({
          error: { ...defaultError(), message: colored, stack: colored },
          console: { errors: 1, warnings: 0, samples: [colored] },
          pageErrors: [colored],
        }),
      );

      expect(capped.attempts[0]?.error?.message).toBe("boom");
      expect(capped.attempts[0]?.error?.stack).toBe("boom");
      expect(capped.attempts[0]?.console?.samples).toEqual(["boom"]);
      expect(capped.attempts[0]?.pageErrors).toEqual(["boom"]);
    });

    it("strips ANSI codes before measuring, so they do not take up the cap", () => {
      const message = `${ANSI_RED}${"x".repeat(MODEL_TEXT_CAPS_BYTES.errorMessage)}${ANSI_RESET}`;

      const capped = capTestResult(resultWithAttempt({ error: { ...defaultError(), message } }));

      expect(capped.attempts[0]?.error?.message).toBe(
        "x".repeat(MODEL_TEXT_CAPS_BYTES.errorMessage),
      );
    });
  });

  describe("BDD steps", () => {
    it("takes as reference the first step neither passed nor skipped, or else the last", () => {
      expect(
        bddReferenceIndex([step(0), step(1, "skipped"), step(2, "failed"), step(3, "undefined")]),
      ).toBe(2);
      expect(bddReferenceIndex([step(0), step(1, "skipped")])).toBe(1);
      expect(bddReferenceIndex([])).toBe(-1);
    });

    it("keeps the 200 steps closest to the reference, in their original order", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 400 }),
          fc.integer({ min: 0, max: 450 }),
          (length, failedAt) => {
            const steps = Array.from({ length }, (_, position) =>
              step(position, position === failedAt ? "failed" : "passed"),
            );
            const reference = bddReferenceIndex(steps);

            const bdd = capTestResult(resultWithSteps(steps)).bdd;
            const kept = (bdd?.steps ?? []).map((item) => Number(item.text.slice(5)));
            const keptSet = new Set(kept);
            const dropped = steps
              .map((_, position) => position)
              .filter((position) => !keptSet.has(position));

            expect(kept).toHaveLength(Math.min(length, MODEL_LIST_CAPS.bddSteps));
            expect(bdd?.stepsDropped).toBe(dropped.length > 0 ? dropped.length : undefined);
            expect(kept).toEqual([...kept].sort((a, b) => a - b));
            if (length > 0) {
              expect(keptSet.has(reference)).toBe(true);
            }
            const rank = (position: number): RankKey => [Math.abs(position - reference), position];
            expectKeptOutrankDropped(kept.map(rank), dropped.map(rank));
          },
        ),
        runOptions,
      );
    });
  });

  describe("text caps", () => {
    it("truncates every text to its cap without splitting characters or escapes", () => {
      // One byte under the cap, then a 4-byte character that does not fit.
      const over = (bytes: number): string => `${trickyText(bytes - 1)}😀`;
      const message = over(MODEL_TEXT_CAPS_BYTES.errorMessage);
      const stack = over(MODEL_TEXT_CAPS_BYTES.errorStack);
      const base = resultWithAttempt({ error: { ...defaultError(), message, stack } });
      const overCap = {
        ...base,
        test: { ...base.test, file: over(MODEL_TEXT_CAPS_BYTES.default) },
      };

      const capped = capTestResult(overCap);

      expect(TestResultSchema.safeParse(capped).success).toBe(true);
      const cappedMessage = capped.attempts[0]?.error?.message ?? "";
      expect(jsonEscapedByteLength(cappedMessage)).toBe(MODEL_TEXT_CAPS_BYTES.errorMessage - 1);
      expect(message.startsWith(cappedMessage)).toBe(true);
      expect(jsonEscapedByteLength(capped.test.file)).toBe(MODEL_TEXT_CAPS_BYTES.default - 1);
    });

    it(
      "gives a result that passes the schema from any result over the caps",
      () => {
        const capped = capTestResult(
          maxedResult({ attempts: 22, steps: 210, tags: 55, titleLevels: 22 }),
        );

        expect(TestResultSchema.safeParse(capped).success).toBe(true);
      },
      HEAVY_TEST_TIMEOUT_MS,
    );

    // Slow next to the rest of the suite: room on a loaded CI runner (#99).
    it(
      "leaves texts at their cap as they are",
      () => {
        const result = maxedResult({ attempts: 1 });

        expect(capTestResult(result)).toEqual(result);
      },
      HEAVY_TEST_TIMEOUT_MS,
    );
  });

  it("never leaves ANSI codes in the texts it cleans", () => {
    const textWithAnsi = fc
      .array(
        fc.oneof(fc.constantFrom(ANSI_RED, ANSI_RESET, "\u001b[1;4m"), fc.string({ maxLength: 5 })),
        {
          maxLength: 20,
        },
      )
      .map((parts) => parts.join(""));
    fc.assert(
      fc.property(textWithAnsi, (message) => {
        const capped = capTestResult(
          resultWithAttempt({ error: { ...defaultError(), message }, pageErrors: [message] }),
        );

        expect(capped.attempts[0]?.error?.message).not.toMatch(ANSI_ESCAPE);
        expect(capped.attempts[0]?.pageErrors?.[0]).not.toMatch(ANSI_ESCAPE);
      }),
      runOptions,
    );
  });
});

describe("capRunHeader", () => {
  it("keeps the first 100 projects, each truncated to 256 bytes, and every text within its cap", () => {
    const { results, ...header } = aRun().build();
    expect(results).toEqual([]);
    const projects = Array.from(
      { length: 120 },
      (_, index) => `${String(index)}-${"p".repeat(300)}`,
    );
    const long = trickyText(3000);

    const capped = capRunHeader({
      ...header,
      git: { ...header.git, branch: long, headSha: long, baseBranch: long },
      ci: { provider: long, runId: long, jobId: long },
      environment: {
        ...header.environment,
        os: long,
        framework: { name: "playwright", version: long },
      },
      frameworkConfig: { retries: 2, projects },
    });

    expect(capped.frameworkConfig?.projects).toHaveLength(MODEL_LIST_CAPS.frameworkProjects);
    expect(capped.frameworkConfig?.projects?.[0]).toBe(`0-${"p".repeat(254)}`);
    expect(capped.frameworkConfig?.retries).toBe(2);
    expect(RunSchema.unwrap().omit({ results: true }).safeParse(capped).success).toBe(true);
  });

  it("returns a header within the caps unchanged", () => {
    const { results, ...header } = aRun().build();
    expect(results).toEqual([]);

    expect(capRunHeader(header)).toEqual(header);
  });
});
