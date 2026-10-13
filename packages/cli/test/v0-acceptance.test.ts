import { writeFile } from "node:fs/promises";
import * as path from "node:path";
import { detectRunContext, readRunFile, runFilePath, writeRunFile } from "@atium/core";
import type { EnvVars, Result, Run, RunContext } from "@atium/core";
import { aRun, aTestResult, FakeGitClient, FakeLogger } from "@atium/core/testing";
import { openSqliteStorage } from "@atium/storage-sqlite";
import { describe, expect, it } from "vitest";
import { useTempDir } from "./temp-dir.js";

// Acceptance criterion of V0 (docs/design/22-roadmap.md §30): a valid run,
// built with the builders, is stored in SQLite and in a run file and read back
// unchanged, with the right Git and CI context on each supported provider.

const MERGE_SHA = "a1b2c3d4e5f60718293a4b5c6d7e8f9012345678";
const HEAD_SHA = "ffeeddccbbaa99887766554433221100ffeeddcc";
const LOCAL_SHA = "0123456789abcdef0123456789abcdef01234567";

/** A CI provider, or a local run, as the environment and Git present it. */
interface Scenario {
  readonly name: string;
  /** Environment of the run; `root` is the repository directory. */
  readonly env: (root: string) => Promise<EnvVars>;
  readonly git: FakeGitClient;
  readonly expected: RunContext;
}

const scenarios: readonly Scenario[] = [
  {
    name: "GitHub Actions",
    env: async (root) => {
      const eventPath = path.join(root, "event.json");
      await writeFile(
        eventPath,
        JSON.stringify({
          pull_request: { number: 42, head: { ref: "feature/login", sha: HEAD_SHA } },
        }),
      );
      return {
        GITHUB_ACTIONS: "true",
        CI: "true",
        GITHUB_EVENT_NAME: "pull_request",
        GITHUB_EVENT_PATH: eventPath,
        GITHUB_SHA: MERGE_SHA,
        GITHUB_REF_NAME: "42/merge",
        GITHUB_HEAD_REF: "feature/login",
        GITHUB_BASE_REF: "main",
        GITHUB_RUN_ID: "9876543210",
        GITHUB_RUN_ATTEMPT: "2",
      };
    },
    git: new FakeGitClient(),
    expected: {
      git: {
        commitSha: MERGE_SHA,
        headSha: HEAD_SHA,
        branch: "feature/login",
        baseBranch: "main",
        dirty: false,
      },
      ci: { provider: "github", runId: "9876543210", runAttempt: 2, prNumber: 42 },
    },
  },
  {
    name: "GitLab CI",
    env: () =>
      Promise.resolve({
        GITLAB_CI: "true",
        CI: "true",
        CI_COMMIT_SHA: MERGE_SHA,
        CI_COMMIT_REF_NAME: "feature/login",
        CI_MERGE_REQUEST_TARGET_BRANCH_NAME: "main",
        CI_MERGE_REQUEST_IID: "15",
        CI_PIPELINE_ID: "1122334455",
        CI_JOB_ID: "5566778899",
      }),
    git: new FakeGitClient(),
    expected: {
      git: { commitSha: MERGE_SHA, branch: "feature/login", baseBranch: "main", dirty: false },
      ci: { provider: "gitlab", runId: "1122334455", jobId: "5566778899", prNumber: 15 },
    },
  },
  {
    name: "Jenkins",
    env: () =>
      Promise.resolve({
        JENKINS_URL: "https://jenkins.example.com/",
        GIT_COMMIT: MERGE_SHA,
        GIT_BRANCH: "PR-12",
        CHANGE_ID: "12",
        CHANGE_BRANCH: "feature/login",
        CHANGE_TARGET: "main",
        BUILD_TAG: "jenkins-shop-PR-12-3",
      }),
    git: new FakeGitClient(),
    expected: {
      git: { commitSha: MERGE_SHA, branch: "feature/login", baseBranch: "main", dirty: false },
      ci: { provider: "jenkins", runId: "jenkins-shop-PR-12-3", prNumber: 12 },
    },
  },
  {
    name: "CircleCI",
    env: () =>
      Promise.resolve({
        CIRCLECI: "true",
        CI: "true",
        CIRCLE_SHA1: MERGE_SHA,
        CIRCLE_BRANCH: "feature/login",
        CIRCLE_PULL_REQUEST: "https://github.com/acme/shop/pull/31",
        CIRCLE_WORKFLOW_ID: "6f1c2b3a-4d5e-4f60-8a9b-0c1d2e3f4a5b",
      }),
    git: new FakeGitClient(),
    expected: {
      git: { commitSha: MERGE_SHA, branch: "feature/login", dirty: false },
      ci: { provider: "circleci", runId: "6f1c2b3a-4d5e-4f60-8a9b-0c1d2e3f4a5b", prNumber: 31 },
    },
  },
  {
    name: "Azure Pipelines",
    env: () =>
      Promise.resolve({
        BUILD_BUILDURI: "vstfs:///Build/Build/4321",
        TF_BUILD: "True",
        BUILD_SOURCEVERSION: MERGE_SHA,
        BUILD_SOURCEBRANCHNAME: "merge",
        SYSTEM_PULLREQUEST_SOURCEBRANCH: "refs/heads/feature/login",
        SYSTEM_PULLREQUEST_TARGETBRANCH: "refs/heads/main",
        SYSTEM_PULLREQUEST_PULLREQUESTID: "57",
        BUILD_BUILDID: "4321",
      }),
    git: new FakeGitClient(),
    expected: {
      git: { commitSha: MERGE_SHA, branch: "feature/login", baseBranch: "main", dirty: false },
      ci: { provider: "azure", runId: "4321", prNumber: 57 },
    },
  },
  {
    name: "a local run",
    env: () => Promise.resolve({}),
    git: new FakeGitClient({ commitSha: LOCAL_SHA, branch: "feature/login", dirty: true }),
    expected: {
      git: { commitSha: LOCAL_SHA, branch: "feature/login", dirty: true },
      ci: { provider: "local" },
    },
  },
];

function unwrap<T>(result: Result<T>): T {
  if (!result.ok) {
    throw new Error(`Expected ok, got ${result.error.code}: ${result.error.message}`, {
      cause: result.error,
    });
  }
  return result.value;
}

/** Writes the run to a new SQLite database and reads it back on a second connection. */
async function roundTripThroughSqlite(
  run: Run,
  rootDir: string,
  logger: FakeLogger,
): Promise<Run | undefined> {
  const writer = unwrap(await openSqliteStorage({ rootDir, logger }));
  try {
    unwrap(await writer.writeRun(run));
  } finally {
    await writer.close();
  }
  const reader = unwrap(await openSqliteStorage({ rootDir, logger }));
  try {
    return unwrap(await reader.getRun(run.id));
  } finally {
    await reader.close();
  }
}

describe("V0 acceptance: a run built with the builders", () => {
  const root = useTempDir("atium-acceptance-");

  it.each(scenarios)(
    "is stored in SQLite and in a run file and read back unchanged on $name",
    async ({ env, git, expected }) => {
      const logger = new FakeLogger();
      const context = await detectRunContext({ env: await env(root()), cwd: root(), git, logger });
      const run = aRun()
        .withSeed(7)
        .with(context)
        .withResult(aTestResult("logs in").passed())
        .withResult(aTestResult("adds to cart").failedThenPassed())
        .withResult(aTestResult("pays").failedAllAttempts(2))
        .build();

      const file = await writeRunFile(run, { rootDir: root(), logger });
      const fromFile = await readRunFile(file);
      const fromSqlite = await roundTripThroughSqlite(run, root(), logger);

      expect(context).toEqual(expected);
      expect(file).toBe(runFilePath(root(), run.id));
      expect(fromFile).toEqual(run);
      expect(fromSqlite).toEqual(run);
      expect(logger.entries.filter((entry) => entry.level !== "debug")).toEqual([]);
    },
  );
});
