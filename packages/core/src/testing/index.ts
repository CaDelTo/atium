/**
 * Test helpers for Atium packages, exposed as `@atium/core/testing`.
 *
 * Immutable builders of the data model with valid, deterministic defaults,
 * and fakes for the core interfaces. Internal to Atium's own tests: it may
 * change without notice and is not intended for production code.
 *
 * @packageDocumentation
 */
export { anAttempt } from "./attempt-builder.js";
export type { AttemptBuilder } from "./attempt-builder.js";
export { anError } from "./error-builder.js";
export type { ErrorBuilder } from "./error-builder.js";
export { FIXED_START, fixedTimePlus } from "./deterministic.js";
export { FakeGitClient } from "./fake-git-client.js";
export type { FakeGitState, GitQuery } from "./fake-git-client.js";
export { FakeLogger } from "./fake-logger.js";
export type { LogEntry } from "./fake-logger.js";
export { fixedClock } from "./fixed-clock.js";
export { InMemoryStorage } from "./in-memory-storage.js";
export { aRun } from "./run-builder.js";
export type { RunBuilder } from "./run-builder.js";
export { aTestCase } from "./test-case-builder.js";
export type { TestCaseBuilder } from "./test-case-builder.js";
export { aTestResult } from "./test-result-builder.js";
export type { TestResultBuilder } from "./test-result-builder.js";
export { rejectedAtiumError, thrownAtiumError } from "./thrown-error.js";
export { unwrap } from "./unwrap.js";
