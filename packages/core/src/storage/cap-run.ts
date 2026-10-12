import { stripVTControlCharacters } from "node:util";
import {
  ENDPOINT_FAILURE_MIN_STATUS,
  MODEL_LIST_CAPS,
  MODEL_TEXT_CAPS_BYTES,
} from "../defaults.js";
import type { Attempt } from "../model/attempt.js";
import type { BddContext } from "../model/bdd.js";
import type { ErrorOccurrence } from "../model/error-occurrence.js";
import type { NetworkCall, NetworkSummary } from "../model/network.js";
import type { TestCase } from "../model/test-case.js";
import type { TestResult } from "../model/test-result.js";
import { truncateUtf8 } from "../model/text.js";
import type { RunHeader } from "./run-file-format.js";
import type { Indexed } from "./select.js";
import { keepFirst, keepFirstAndLast, keepLast, keepRanked } from "./select.js";

// List and text caps of ADR-0018, applied by the writer before validating.
// The `testId` is never recomputed: it comes from the original values
// (02-data-model.md §9.3), so capping `titlePath` does not change it.

type NetworkEndpoint = NetworkSummary["endpoints"][number];
type BddStep = BddContext["steps"][number];

/** BDD step statuses that do not make a step the reference of the caps. */
const UNREMARKABLE_STEP_STATUSES: ReadonlySet<string> = new Set(["passed", "skipped"]);

/** Truncates a string without a cap of its own. */
function text(value: string): string {
  return truncateUtf8(value, MODEL_TEXT_CAPS_BYTES.default);
}

/** Removes ANSI escape codes, then truncates: the text is stored as plain text. */
function plainText(value: string, maxBytes: number): string {
  return truncateUtf8(stripVTControlCharacters(value), maxBytes);
}

/**
 * Previous count plus what a cap dropped. The spread of the original object
 * already carries the previous count, so callers only set the field when the
 * cap dropped something; a count of 0 stays absent.
 */
function addDropped(previous: number | undefined, dropped: number): number {
  return (previous ?? 0) + dropped;
}

/**
 * Index of the reference step of a BDD scenario: the first step whose status
 * is neither `passed` nor `skipped` or, if there is none, the last step
 * (ADR-0018).
 *
 * @param steps - Steps of a scenario, in order.
 * @returns Index of the reference step, or `-1` when there are no steps.
 */
export function bddReferenceIndex(steps: readonly BddStep[]): number {
  const index = steps.findIndex((step) => !UNREMARKABLE_STEP_STATUSES.has(step.status));
  return index === -1 ? steps.length - 1 : index;
}

/** Ranks steps by distance of index to the reference; ties go to the lower index. */
function byDistanceTo(reference: number): (a: Indexed<BddStep>, b: Indexed<BddStep>) => number {
  return (a, b) => Math.abs(a.index - reference) - Math.abs(b.index - reference);
}

/** Moment the network calls of an attempt are kept around: the failure or, without one, the end. */
function attemptReferenceMs(attempt: Attempt): number {
  return attempt.error?.failedAtMs ?? attempt.durationMs;
}

/** A call that started at the reference or before and had not finished. */
function isPendingAt(call: NetworkCall, referenceMs: number): boolean {
  return (
    call.startedAtMs <= referenceMs &&
    (call.durationMs === undefined || call.startedAtMs + call.durationMs > referenceMs)
  );
}

/**
 * Ranks calls for the cap of ADR-0018: pending calls first, then by distance
 * to the reference; on a tie, the call before the reference.
 */
function callRank(
  referenceMs: number,
): (a: Indexed<NetworkCall>, b: Indexed<NetworkCall>) => number {
  const pending = (call: NetworkCall): number => (isPendingAt(call, referenceMs) ? 0 : 1);
  const distance = (call: NetworkCall): number => Math.abs(call.startedAtMs - referenceMs);
  const after = (call: NetworkCall): number => (call.startedAtMs > referenceMs ? 1 : 0);
  return ({ item: a }, { item: b }) =>
    pending(a) - pending(b) || distance(a) - distance(b) || after(a) - after(b);
}

function hasFailures(endpoint: NetworkEndpoint): boolean {
  return (
    endpoint.failures > 0 ||
    Object.keys(endpoint.statuses).some((status) => Number(status) >= ENDPOINT_FAILURE_MIN_STATUS)
  );
}

/** Ranks endpoints for the cap of ADR-0018: those with failures first, then by `count`. */
function endpointRank(a: Indexed<NetworkEndpoint>, b: Indexed<NetworkEndpoint>): number {
  return Number(hasFailures(b.item)) - Number(hasFailures(a.item)) || b.item.count - a.item.count;
}

/** Truncates the status codes; codes that become equal add up their counts. */
function capStatuses(statuses: Readonly<Record<string, number>>): Readonly<Record<string, number>> {
  const capped: Record<string, number> = {};
  for (const [status, count] of Object.entries(statuses)) {
    const key = text(status);
    capped[key] = (capped[key] ?? 0) + count;
  }
  return capped;
}

function capEndpoint(endpoint: NetworkEndpoint): NetworkEndpoint {
  return {
    ...endpoint,
    method: text(endpoint.method),
    urlTemplate: text(endpoint.urlTemplate),
    statuses: capStatuses(endpoint.statuses),
  };
}

function capCall(call: NetworkCall): NetworkCall {
  return {
    ...call,
    method: text(call.method),
    urlTemplate: text(call.urlTemplate),
    host: text(call.host),
    ...(call.failure === undefined ? {} : { failure: text(call.failure) }),
    ...(call.graphqlOperation === undefined
      ? {}
      : { graphqlOperation: text(call.graphqlOperation) }),
  };
}

function capNetwork(network: NetworkSummary, referenceMs: number): NetworkSummary {
  const endpoints = keepRanked(network.endpoints, MODEL_LIST_CAPS.networkEndpoints, endpointRank);
  const capped: NetworkSummary = {
    ...network,
    endpoints: endpoints.items.map(capEndpoint),
    ...(endpoints.dropped > 0
      ? { endpointsDropped: addDropped(network.endpointsDropped, endpoints.dropped) }
      : {}),
  };
  if (network.calls === undefined) {
    return capped;
  }
  const calls = keepRanked(network.calls, MODEL_LIST_CAPS.networkCalls, callRank(referenceMs));
  return {
    ...capped,
    calls: calls.items.map(capCall),
    ...(calls.dropped > 0 ? { callsDropped: addDropped(network.callsDropped, calls.dropped) } : {}),
  };
}

function capError(error: ErrorOccurrence): ErrorOccurrence {
  const { matcher } = error;
  return {
    ...error,
    family: text(error.family),
    type: text(error.type),
    message: plainText(error.message, MODEL_TEXT_CAPS_BYTES.errorMessage),
    ...(error.stack === undefined
      ? {}
      : { stack: plainText(error.stack, MODEL_TEXT_CAPS_BYTES.errorStack) }),
    ...(error.locator === undefined ? {} : { locator: text(error.locator) }),
    ...(matcher === undefined
      ? {}
      : {
          matcher: {
            ...matcher,
            name: text(matcher.name),
            ...(matcher.expected === undefined
              ? {}
              : { expected: truncateUtf8(matcher.expected, MODEL_TEXT_CAPS_BYTES.matcherValue) }),
            ...(matcher.actual === undefined
              ? {}
              : { actual: truncateUtf8(matcher.actual, MODEL_TEXT_CAPS_BYTES.matcherValue) }),
          },
        }),
  };
}

function capArtifacts(
  artifacts: NonNullable<Attempt["artifacts"]>,
): NonNullable<Attempt["artifacts"]> {
  return {
    ...artifacts,
    ...(artifacts.trace === undefined ? {} : { trace: text(artifacts.trace) }),
    ...(artifacts.screenshots === undefined
      ? {}
      : { screenshots: artifacts.screenshots.map(text) }),
    ...(artifacts.ariaSnapshot === undefined ? {} : { ariaSnapshot: text(artifacts.ariaSnapshot) }),
    ...(artifacts.video === undefined ? {} : { video: text(artifacts.video) }),
  };
}

function capAttempt(attempt: Attempt): Attempt {
  const { console: consoleSummary, pageErrors, network, error, artifacts } = attempt;
  const capped: Attempt = {
    ...attempt,
    ...(error === undefined ? {} : { error: capError(error) }),
    ...(network === undefined ? {} : { network: capNetwork(network, attemptReferenceMs(attempt)) }),
    ...(artifacts === undefined ? {} : { artifacts: capArtifacts(artifacts) }),
  };
  const withConsole: Attempt =
    consoleSummary === undefined
      ? capped
      : {
          ...capped,
          console: {
            ...consoleSummary,
            // No order is given for samples; the last ones are the closest to the failure.
            samples: keepLast(consoleSummary.samples, MODEL_LIST_CAPS.consoleSamples).items.map(
              (sample) => plainText(sample, MODEL_TEXT_CAPS_BYTES.consoleSample),
            ),
          },
        };
  if (pageErrors === undefined) {
    return withConsole;
  }
  const kept = keepLast(pageErrors, MODEL_LIST_CAPS.pageErrors);
  return {
    ...withConsole,
    pageErrors: kept.items.map((pageError) =>
      plainText(pageError, MODEL_TEXT_CAPS_BYTES.pageError),
    ),
    ...(kept.dropped > 0
      ? { pageErrorsDropped: addDropped(attempt.pageErrorsDropped, kept.dropped) }
      : {}),
  };
}

function capStep(step: BddStep): BddStep {
  return {
    ...step,
    keyword: text(step.keyword),
    text: truncateUtf8(step.text, MODEL_TEXT_CAPS_BYTES.bddStepText),
    status: text(step.status),
    ...(step.definition === undefined
      ? {}
      : { definition: truncateUtf8(step.definition, MODEL_TEXT_CAPS_BYTES.bddStepDefinition) }),
  };
}

function capBdd(bdd: BddContext): BddContext {
  const steps = keepRanked(
    bdd.steps,
    MODEL_LIST_CAPS.bddSteps,
    byDistanceTo(bddReferenceIndex(bdd.steps)),
  );
  return {
    ...bdd,
    feature: text(bdd.feature),
    scenario: text(bdd.scenario),
    steps: steps.items.map(capStep),
    ...(steps.dropped > 0 ? { stepsDropped: addDropped(bdd.stepsDropped, steps.dropped) } : {}),
  };
}

function capTestCase(test: TestCase): TestCase {
  return {
    ...test,
    ...(test.project === undefined ? {} : { project: text(test.project) }),
    file: text(test.file),
    titlePath: keepFirstAndLast(test.titlePath, MODEL_LIST_CAPS.titlePathLevels).items.map(text),
    tags: keepFirst(test.tags, MODEL_LIST_CAPS.tags).items.map(text),
  };
}

/**
 * Applies the list and text caps of ADR-0018 to a result, so it passes
 * {@link TestResultSchema}: removes ANSI codes from `message`, `stack`, the
 * console samples and `pageErrors`, keeps the items each cap keeps in their
 * original order, adds what it drops to the `*Dropped` counts and truncates
 * every string to its cap.
 *
 * Identifiers and timestamps are left as they are: truncating them would
 * make them invalid instead of shorter.
 *
 * @param result - Result as the adapter built it, possibly over the caps.
 * @returns The capped result. A result within the caps comes back equal.
 */
export function capTestResult(result: TestResult): TestResult {
  const attempts = keepFirstAndLast(result.attempts, MODEL_LIST_CAPS.attempts);
  return {
    ...result,
    test: capTestCase(result.test),
    attempts: attempts.items.map(capAttempt),
    ...(attempts.dropped > 0
      ? { attemptsDropped: addDropped(result.attemptsDropped, attempts.dropped) }
      : {}),
    ...(result.bdd === undefined ? {} : { bdd: capBdd(result.bdd) }),
  };
}

/**
 * Applies the list and text caps of ADR-0018 to the run header (the `Run`
 * without `results`).
 *
 * @param header - Header as the adapter built it, possibly over the caps.
 * @returns The capped header.
 */
export function capRunHeader(header: RunHeader): RunHeader {
  const { git, ci, environment, frameworkConfig } = header;
  return {
    ...header,
    git: {
      ...git,
      commitSha: text(git.commitSha),
      ...(git.headSha === undefined ? {} : { headSha: text(git.headSha) }),
      ...(git.branch === undefined ? {} : { branch: text(git.branch) }),
      ...(git.baseBranch === undefined ? {} : { baseBranch: text(git.baseBranch) }),
    },
    ...(ci === undefined
      ? {}
      : {
          ci: {
            ...ci,
            provider: text(ci.provider),
            ...(ci.runId === undefined ? {} : { runId: text(ci.runId) }),
            ...(ci.jobId === undefined ? {} : { jobId: text(ci.jobId) }),
          },
        }),
    environment: {
      ...environment,
      os: text(environment.os),
      arch: text(environment.arch),
      nodeVersion: text(environment.nodeVersion),
      framework: {
        ...environment.framework,
        ...(environment.framework.version === undefined
          ? {}
          : { version: text(environment.framework.version) }),
      },
    },
    ...(frameworkConfig?.projects === undefined
      ? {}
      : {
          frameworkConfig: {
            ...frameworkConfig,
            projects: keepFirst(
              frameworkConfig.projects,
              MODEL_LIST_CAPS.frameworkProjects,
            ).items.map((project) => truncateUtf8(project, MODEL_TEXT_CAPS_BYTES.frameworkProject)),
          },
        }),
  };
}
