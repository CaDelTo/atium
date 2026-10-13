import { RunSchema } from "@atium/core";
import type { Attempt, Run } from "@atium/core";
import { aRun, aTestCase, aTestResult, anError, fixedTimePlus } from "@atium/core/testing";
import type { TestResultBuilder } from "@atium/core/testing";

// Runs for the tests of this package. The full one sets every optional field
// of the model, so a column that is not stored or not read back shows up as a
// difference.

/** The optional fields of an attempt, all set. */
function withEveryAttemptField(attempt: Attempt): Attempt {
  return {
    ...attempt,
    network: {
      endpoints: [
        {
          method: "POST",
          urlTemplate: "/api/login",
          count: 2,
          statuses: { "200": 1, "500": 1 },
          failures: 1,
          p95Ms: 340,
        },
      ],
      endpointsDropped: 3,
      calls: [
        {
          method: "POST",
          urlTemplate: "/api/login",
          host: "app.example.test",
          status: 500,
          failure: "net::ERR_FAILED",
          startedAtMs: 120,
          durationMs: 340,
          graphqlOperation: "Login",
        },
      ],
      callsDropped: 7,
    },
    console: { errors: 2, warnings: 1, samples: ["Uncaught TypeError", "Failed to load"] },
    pageErrors: ["TypeError: x is undefined"],
    pageErrorsDropped: 4,
    artifacts: {
      trace: "test-results/login/trace.zip",
      screenshots: ["test-results/login/failure.png"],
      ariaSnapshot: "test-results/login/aria.yml",
      video: "test-results/login/video.webm",
    },
  };
}

/** A flaky result with every optional field of a result and of its test set. */
function fullResult(): TestResultBuilder {
  return aTestResult()
    .forTest(
      aTestCase("logs in")
        .inProject("chromium")
        .withTags("@smoke", "@login")
        .with({ location: { line: 12, column: 3 } }),
    )
    .failedThenPassed()
    .with({
      attemptsDropped: 2,
      workerIndex: 1,
      sequenceInWorker: 5,
      quarantined: true,
      bdd: {
        feature: "Login",
        scenario: "Valid credentials",
        steps: [
          {
            keyword: "Given",
            text: "a registered user",
            status: "passed",
            durationMs: 12,
            definition: "steps/login.ts:4",
          },
        ],
        stepsDropped: 1,
      },
      detailTruncated: true,
    });
}

/**
 * A run with every optional field of the model set, at every level.
 *
 * @returns The run, validated by `RunSchema`.
 */
export function runWithEveryField(): Run {
  const built = aRun()
    .withSeed(1)
    .with({
      git: {
        commitSha: "3f2a9c1e5b7d",
        headSha: "9e8d7c6b5a4f",
        branch: "feature/login",
        baseBranch: "main",
        dirty: true,
      },
      ci: {
        provider: "github",
        runId: "12345",
        runAttempt: 2,
        jobId: "e2e",
        shard: { index: 2, total: 4 },
        prNumber: 42,
      },
      frameworkConfig: { retries: 2, workers: 4, projects: ["chromium", "firefox"] },
    })
    .withResult(fullResult())
    .withResult(aTestResult("logs out").passed())
    .build();
  const [first, ...rest] = built.results;
  if (first === undefined) {
    throw new Error("The run builder dropped the results of the full run.");
  }
  const [failed, ...retries] = first.attempts;
  if (failed === undefined) {
    throw new Error("The full run lost its failed attempt.");
  }
  const error = anError("AssertionError")
    .with({
      stack: "AssertionError: expected\n    at login (tests/login.spec.ts:20:5)",
      locator: "getByRole('button', { name: 'Log in' })",
      matcher: { name: "toHaveText", expected: "Welcome", actual: "Wrong password" },
    })
    .build();
  return RunSchema.parse({
    ...built,
    results: [
      {
        ...first,
        attempts: [withEveryAttemptField({ ...failed, error }), ...retries],
      },
      ...rest,
    ],
  });
}

/**
 * A run with an id from `seed`, started `offsetMs` after the fixed start,
 * with the given results.
 *
 * @param seed - Seed of the run id.
 * @param offsetMs - Start of the run after the fixed start.
 * @param results - Builders of its results.
 * @returns The run.
 */
export function runAt(
  seed: number,
  offsetMs: number,
  ...results: ReturnType<typeof aTestResult>[]
): Run {
  return results
    .reduce(
      (builder, result) => builder.withResult(result),
      aRun()
        .withSeed(seed)
        .with({ startedAt: fixedTimePlus(offsetMs), finishedAt: fixedTimePlus(offsetMs + 60_000) }),
    )
    .build();
}
