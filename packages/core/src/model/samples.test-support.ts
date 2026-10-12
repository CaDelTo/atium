import type { z } from "zod";
import type { AttemptSchema } from "./attempt.js";
import type { BddContextSchema } from "./bdd.js";
import type { ErrorOccurrenceSchema } from "./error-occurrence.js";
import type { NetworkCallSchema, NetworkSummarySchema } from "./network.js";
import { SCHEMA_VERSION } from "./run.js";
import type { RunSchema } from "./run.js";
import type { TestCaseSchema } from "./test-case.js";
import type { TestResultSchema } from "./test-result.js";

// Valid inputs for the model schema tests: a minimal one with only the
// required fields and a full one with every optional field set. They are
// written out instead of built with `@atium/core/testing`, on purpose: the
// builders validate with these schemas, so the schema tests stay independent.

type NetworkEndpointInput = z.input<typeof NetworkSummarySchema>["endpoints"][number];
type BddStepInput = z.input<typeof BddContextSchema>["steps"][number];

const STARTED_AT = "2026-10-08T14:03:00.000Z";

/** Copy of `value` without `key`, to build inputs with a missing field. */
export function without(value: object, key: string): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([name]) => name !== key));
}

/** String of `bytes` ASCII characters, so its escaped size is `bytes`. */
export function textOfBytes(bytes: number): string {
  return "x".repeat(bytes);
}

/** List of `length` copies of `item`. */
export function listOf<T>(length: number, item: T): T[] {
  return Array.from({ length }, () => item);
}

/** Valid `TestCase` input with only the required fields. */
export function minimalTestCase(): z.input<typeof TestCaseSchema> {
  return {
    testId: "0123456789abcdef",
    file: "tests/login.spec.ts",
    titlePath: ["login", "rejects a wrong password"],
    tags: [],
  };
}

/** Valid `TestCase` input with every optional field set. */
export function fullTestCase(): z.input<typeof TestCaseSchema> {
  return {
    ...minimalTestCase(),
    project: "chromium",
    tags: ["@smoke"],
    location: { line: 12, column: 3 },
  };
}

/** Valid `ErrorOccurrence` input with only the required fields. */
export function minimalError(): z.input<typeof ErrorOccurrenceSchema> {
  return {
    fingerprint: "fedcba9876543210",
    family: "TimeoutError|tests/login.spec.ts:fillPassword",
    type: "TimeoutError",
    message: "Timeout 5000ms exceeded.",
    failedAtMs: 5000,
  };
}

/** Valid `ErrorOccurrence` input with every optional field set. */
export function fullError(): z.input<typeof ErrorOccurrenceSchema> {
  return {
    ...minimalError(),
    stack: "TimeoutError: Timeout 5000ms exceeded.\n    at fillPassword (tests/login.spec.ts:20:5)",
    locator: "getByLabel('Password')",
    matcher: { name: "toHaveText", expected: "Welcome", actual: "Wrong password" },
  };
}

/** Valid `NetworkCall` input with only the required fields. */
export function minimalCall(): z.input<typeof NetworkCallSchema> {
  return {
    method: "GET",
    urlTemplate: "/api/users/:id",
    host: "app.example.test",
    startedAtMs: 10,
  };
}

/** Valid `NetworkCall` input with every optional field set. */
export function fullCall(): z.input<typeof NetworkCallSchema> {
  return {
    ...minimalCall(),
    status: 500,
    failure: "net::ERR_FAILED",
    durationMs: 30,
    graphqlOperation: "GetUser",
  };
}

/** Valid input for one item of `NetworkSummary.endpoints`. */
export function endpoint(): NetworkEndpointInput {
  return {
    method: "GET",
    urlTemplate: "/api/users/:id",
    count: 2,
    statuses: { "200": 1, "500": 1 },
    failures: 1,
    p95Ms: 25,
  };
}

/** Valid `NetworkSummary` input with only the required fields. */
export function minimalNetwork(): z.input<typeof NetworkSummarySchema> {
  return { endpoints: [] };
}

/** Valid `NetworkSummary` input with every optional field set. */
export function fullNetwork(): z.input<typeof NetworkSummarySchema> {
  return { endpoints: [endpoint()], endpointsDropped: 3, calls: [fullCall()], callsDropped: 2 };
}

/** Valid input for one item of `BddContext.steps`, without the optional `definition`. */
export function bddStep(): BddStepInput {
  return { keyword: "Given ", text: "I am on the login page", status: "passed", durationMs: 12 };
}

/** Valid `BddContext` input with only the required fields. */
export function minimalBdd(): z.input<typeof BddContextSchema> {
  return { feature: "Login", scenario: "Wrong password", steps: [] };
}

/** Valid `BddContext` input with every optional field set. */
export function fullBdd(): z.input<typeof BddContextSchema> {
  return {
    ...minimalBdd(),
    steps: [{ ...bddStep(), definition: "steps/login.steps.ts:4" }],
    stepsDropped: 1,
  };
}

/** Valid `Attempt` input with only the required fields. */
export function minimalAttempt(): z.input<typeof AttemptSchema> {
  return { index: 0, status: "passed", startedAt: STARTED_AT, durationMs: 1200 };
}

/** Valid `Attempt` input with every optional field set. */
export function fullAttempt(): z.input<typeof AttemptSchema> {
  return {
    ...minimalAttempt(),
    status: "failed",
    error: fullError(),
    network: fullNetwork(),
    console: { errors: 1, warnings: 0, samples: ["Failed to load resource: 500"] },
    pageErrors: ["TypeError: user is undefined"],
    pageErrorsDropped: 4,
    artifacts: {
      trace: "test-results/login/trace.zip",
      screenshots: ["test-results/login/failure.png"],
      ariaSnapshot: "test-results/login/aria.yml",
      video: "test-results/login/video.webm",
    },
  };
}

/** Valid `TestResult` input with only the required fields. */
export function minimalResult(): z.input<typeof TestResultSchema> {
  return {
    test: minimalTestCase(),
    outcome: "passed",
    attempts: [minimalAttempt()],
    quarantined: false,
  };
}

/** Valid `TestResult` input with every optional field set. */
export function fullResult(): z.input<typeof TestResultSchema> {
  return {
    test: fullTestCase(),
    outcome: "flaky",
    attempts: [fullAttempt(), { ...minimalAttempt(), index: 2 }],
    attemptsDropped: 1,
    workerIndex: 0,
    sequenceInWorker: 3,
    quarantined: true,
    bdd: fullBdd(),
    detailTruncated: true,
  };
}

/** Valid `Run` input with only the required fields and no results. */
export function minimalRun(): z.input<typeof RunSchema> {
  return {
    schemaVersion: SCHEMA_VERSION,
    id: "0199c2a4-5b3e-7c1d-8e2f-3a4b5c6d7e8f",
    git: { commitSha: "3f2a9c1e5b7d4a6f8e0c2b4d6a8f1e3c5b7d9a0f", dirty: false },
    environment: {
      os: "linux",
      arch: "x64",
      nodeVersion: "22.20.0",
      framework: { name: "playwright" },
    },
    startedAt: STARTED_AT,
    finishedAt: "2026-10-08T14:05:30.000Z",
    results: [],
  };
}

/** Valid `Run` input with every optional field set and two results. */
export function fullRun(): z.input<typeof RunSchema> {
  const run = minimalRun();
  return {
    ...run,
    git: { ...run.git, headSha: "9d8c7b6a", branch: "feat/login", baseBranch: "main", dirty: true },
    ci: {
      provider: "github",
      runId: "38197467024",
      runAttempt: 2,
      jobId: "e2e",
      shard: { index: 1, total: 4 },
      prNumber: 42,
    },
    environment: { ...run.environment, framework: { name: "playwright", version: "1.55.0" } },
    frameworkConfig: { retries: 2, workers: 4, projects: ["chromium", "firefox"] },
    results: [fullResult(), minimalResult()],
  };
}
