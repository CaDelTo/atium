import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GITHUB_EVENT_MAX_BYTES } from "../defaults.js";
import { aRun } from "../testing/run-builder.js";
import { FakeGitClient } from "../testing/fake-git-client.js";
import { FakeLogger } from "../testing/fake-logger.js";
import { rejectedAtiumError } from "../testing/thrown-error.js";
import type { EnvVars } from "../env.js";
import { detectRunContext } from "./detect-run-context.js";
import type { RunContext } from "./detect-run-context.js";

const MERGE_SHA = "a1b2c3d4e5f60718293a4b5c6d7e8f9012345678";
const HEAD_SHA = "ffeeddccbbaa99887766554433221100ffeeddcc";

let cwd: string;
let git: FakeGitClient;
let logger: FakeLogger;

beforeEach(async () => {
  cwd = await mkdtemp(path.join(tmpdir(), "atium-ci-"));
  git = new FakeGitClient();
  logger = new FakeLogger();
});

afterEach(async () => {
  await rm(cwd, { recursive: true, force: true });
});

function detect(env: EnvVars): Promise<RunContext> {
  return detectRunContext({ env, cwd, git, logger });
}

async function writeEvent(payload: unknown): Promise<string> {
  const file = path.join(cwd, "event.json");
  await writeFile(file, JSON.stringify(payload));
  return file;
}

describe("detectRunContext on GitHub Actions", () => {
  const github = {
    GITHUB_ACTIONS: "true",
    GITHUB_SHA: MERGE_SHA,
    GITHUB_RUN_ID: "9876543210",
    GITHUB_RUN_ATTEMPT: "2",
  };

  it("reads a push from the environment without querying Git", async () => {
    const eventPath = await writeEvent({ ref: "refs/heads/main", after: MERGE_SHA });

    const context = await detect({
      ...github,
      GITHUB_EVENT_NAME: "push",
      GITHUB_REF_NAME: "main",
      GITHUB_HEAD_REF: "",
      GITHUB_BASE_REF: "",
      GITHUB_EVENT_PATH: eventPath,
    });

    expect(context).toEqual({
      git: { commitSha: MERGE_SHA, branch: "main", dirty: false },
      ci: { provider: "github", runId: "9876543210", runAttempt: 2 },
    });
    expect(git.queries).toEqual([]);
    expect(logger.entries).toEqual([]);
  });

  it("keeps the merge commit as the commit and takes the pull request head and number from the event payload", async () => {
    const eventPath = await writeEvent({
      action: "synchronize",
      number: 42,
      pull_request: {
        number: 42,
        head: { ref: "feature/login", sha: HEAD_SHA },
        base: { ref: "main", sha: "0000000000000000000000000000000000000001" },
      },
    });

    const context = await detect({
      ...github,
      GITHUB_EVENT_NAME: "pull_request",
      GITHUB_REF_NAME: "42/merge",
      GITHUB_HEAD_REF: "feature/login",
      GITHUB_BASE_REF: "main",
      GITHUB_EVENT_PATH: eventPath,
    });

    expect(context).toEqual({
      git: {
        commitSha: MERGE_SHA,
        headSha: HEAD_SHA,
        branch: "feature/login",
        baseBranch: "main",
        dirty: false,
      },
      ci: { provider: "github", runId: "9876543210", runAttempt: 2, prNumber: 42 },
    });
  });

  it("resolves a relative event path against the working directory", async () => {
    await writeEvent({ pull_request: { number: 7 } });

    const context = await detect({ ...github, GITHUB_EVENT_PATH: "event.json" });

    expect(context.ci.prNumber).toBe(7);
    expect(context.git.headSha).toBeUndefined();
  });

  it("warns and leaves out the pull request when the event payload cannot be read", async () => {
    const context = await detect({
      ...github,
      GITHUB_EVENT_PATH: path.join(cwd, "missing.json"),
    });

    expect(context.ci).toEqual({ provider: "github", runId: "9876543210", runAttempt: 2 });
    expect(logger.entries.map((entry) => entry.level)).toEqual(["warn"]);
    expect(logger.entries[0]?.message).toContain("GitHub event payload");
  });

  it("warns without quoting the payload and leaves out the pull request when the event payload is not JSON", async () => {
    const file = path.join(cwd, "event.json");
    await writeFile(file, '{ "title": "secret-token-123", not json');

    const context = await detect({ ...github, GITHUB_EVENT_PATH: file });

    expect(context.ci.prNumber).toBeUndefined();
    expect(logger.entries).toEqual([
      {
        level: "warn",
        message:
          "The GitHub event payload is not valid JSON; the run is saved without the pull request number and head commit",
        context: { file, error: "SyntaxError" },
      },
    ]);
  });

  it("reads an event payload of exactly the size cap", async () => {
    const json = JSON.stringify({ pull_request: { number: 42 } });
    const file = path.join(cwd, "event.json");
    await writeFile(file, json.padEnd(GITHUB_EVENT_MAX_BYTES, " "));

    const context = await detect({ ...github, GITHUB_EVENT_PATH: file });

    expect(context.ci.prNumber).toBe(42);
    expect(logger.entries).toEqual([]);
  });

  it("warns and leaves out the pull request when the event payload is over the size cap, without parsing it", async () => {
    const json = JSON.stringify({ pull_request: { number: 42 } });
    const file = path.join(cwd, "event.json");
    await writeFile(file, json.padEnd(GITHUB_EVENT_MAX_BYTES + 1, " "));

    const context = await detect({ ...github, GITHUB_EVENT_PATH: file });

    expect(context.ci.prNumber).toBeUndefined();
    expect(logger.entries).toEqual([
      {
        level: "warn",
        message:
          "The GitHub event payload is too large to read; the run is saved without the pull request number and head commit",
        context: { file, maxBytes: GITHUB_EVENT_MAX_BYTES },
      },
    ]);
  });

  it("warns and leaves out the pull request when its number is not a positive integer", async () => {
    const eventPath = await writeEvent({ pull_request: { number: "42", head: { sha: HEAD_SHA } } });

    const context = await detect({ ...github, GITHUB_EVENT_PATH: eventPath });

    expect(context.ci.prNumber).toBeUndefined();
    expect(context.git.headSha).toBeUndefined();
    expect(logger.entries.map((entry) => entry.level)).toEqual(["warn"]);
  });

  it("leaves out a run attempt that is not a positive integer", async () => {
    const context = await detect({ ...github, GITHUB_RUN_ATTEMPT: "abc" });

    expect(context.ci).toEqual({ provider: "github", runId: "9876543210" });
  });
});

describe("detectRunContext on the other CI providers", () => {
  it("reads a GitLab merge request pipeline", async () => {
    const context = await detect({
      GITLAB_CI: "true",
      CI: "true",
      CI_COMMIT_SHA: MERGE_SHA,
      CI_COMMIT_REF_NAME: "feature/login",
      CI_MERGE_REQUEST_TARGET_BRANCH_NAME: "main",
      CI_MERGE_REQUEST_IID: "15",
      CI_MERGE_REQUEST_ID: "99887766",
      CI_PIPELINE_ID: "1122334455",
      CI_JOB_ID: "5566778899",
    });

    expect(context).toEqual({
      git: { commitSha: MERGE_SHA, branch: "feature/login", baseBranch: "main", dirty: false },
      ci: { provider: "gitlab", runId: "1122334455", jobId: "5566778899", prNumber: 15 },
    });
  });

  it("reads a Jenkins multibranch pull request build", async () => {
    const context = await detect({
      JENKINS_URL: "https://jenkins.example.com/",
      GIT_COMMIT: MERGE_SHA,
      GIT_BRANCH: "PR-12",
      CHANGE_ID: "12",
      CHANGE_BRANCH: "feature/login",
      CHANGE_TARGET: "main",
      BUILD_TAG: "jenkins-shop-PR-12-3",
    });

    expect(context).toEqual({
      git: { commitSha: MERGE_SHA, branch: "feature/login", baseBranch: "main", dirty: false },
      ci: { provider: "jenkins", runId: "jenkins-shop-PR-12-3", prNumber: 12 },
    });
  });

  it("reads a Jenkins branch build", async () => {
    const context = await detect({
      JENKINS_URL: "https://jenkins.example.com/",
      GIT_COMMIT: MERGE_SHA,
      GIT_BRANCH: "main",
      BUILD_TAG: "jenkins-shop-main-8",
    });

    expect(context).toEqual({
      git: { commitSha: MERGE_SHA, branch: "main", dirty: false },
      ci: { provider: "jenkins", runId: "jenkins-shop-main-8" },
    });
  });

  it("reads a CircleCI pull request build, with the number taken from its URL", async () => {
    const context = await detect({
      CIRCLECI: "true",
      CI: "true",
      CIRCLE_SHA1: MERGE_SHA,
      CIRCLE_BRANCH: "feature/login",
      CIRCLE_PULL_REQUEST: "https://github.com/acme/shop/pull/31",
      CIRCLE_WORKFLOW_ID: "6f1c2b3a-4d5e-4f60-8a9b-0c1d2e3f4a5b",
    });

    expect(context).toEqual({
      git: { commitSha: MERGE_SHA, branch: "feature/login", dirty: false },
      ci: {
        provider: "circleci",
        runId: "6f1c2b3a-4d5e-4f60-8a9b-0c1d2e3f4a5b",
        prNumber: 31,
      },
    });
  });

  it("ignores a CircleCI pull request URL that does not end in a number", async () => {
    const context = await detect({
      CIRCLECI: "true",
      CIRCLE_SHA1: MERGE_SHA,
      CIRCLE_PULL_REQUEST: "https://github.com/acme/shop/pull/",
    });

    expect(context.ci).toEqual({ provider: "circleci" });
  });

  it("reads an Azure Pipelines pull request build, with the branches taken from the pull request", async () => {
    const context = await detect({
      BUILD_BUILDURI: "vstfs:///Build/Build/4321",
      TF_BUILD: "True",
      BUILD_SOURCEVERSION: MERGE_SHA,
      BUILD_SOURCEBRANCHNAME: "merge",
      SYSTEM_PULLREQUEST_SOURCEBRANCH: "refs/heads/feature/login",
      SYSTEM_PULLREQUEST_TARGETBRANCH: "refs/heads/main",
      SYSTEM_PULLREQUEST_PULLREQUESTID: "57",
      BUILD_BUILDID: "4321",
    });

    expect(context).toEqual({
      git: { commitSha: MERGE_SHA, branch: "feature/login", baseBranch: "main", dirty: false },
      ci: { provider: "azure", runId: "4321", prNumber: 57 },
    });
  });

  it("reads an Azure Pipelines branch build", async () => {
    const context = await detect({
      BUILD_BUILDURI: "vstfs:///Build/Build/4322",
      BUILD_SOURCEVERSION: MERGE_SHA,
      BUILD_SOURCEBRANCHNAME: "main",
      BUILD_BUILDID: "4322",
    });

    expect(context).toEqual({
      git: { commitSha: MERGE_SHA, branch: "main", dirty: false },
      ci: { provider: "azure", runId: "4322" },
    });
  });

  it("falls back to env-ci for a CI provider without rules of its own", async () => {
    const context = await detect({
      CI: "true",
      TRAVIS: "true",
      TRAVIS_COMMIT: MERGE_SHA,
      TRAVIS_BRANCH: "main",
      TRAVIS_PULL_REQUEST: "23",
      TRAVIS_PULL_REQUEST_BRANCH: "feature/login",
      TRAVIS_BUILD_NUMBER: "301",
      TRAVIS_JOB_NUMBER: "301.1",
    });

    expect(context).toEqual({
      git: { commitSha: MERGE_SHA, branch: "feature/login", baseBranch: "main", dirty: false },
      ci: { provider: "travis", runId: "301", jobId: "301.1", prNumber: 23 },
    });
  });

  it("treats a CI that env-ci does not recognize as local", async () => {
    const context = await detect({ CI: "true" });

    expect(context.ci).toEqual({ provider: "local" });
    expect(context.git.commitSha).toBe("0123456789abcdef0123456789abcdef01234567");
  });

  it("asks Git for the commit and branch when the CI does not give them, without checking dirty", async () => {
    git = new FakeGitClient({ branch: "main", dirty: true });

    const context = await detect({ JENKINS_URL: "https://jenkins.example.com/" });

    expect(context.git).toEqual({
      commitSha: "0123456789abcdef0123456789abcdef01234567",
      branch: "main",
      dirty: false,
    });
    expect([...git.queries].sort((a, b) => a.localeCompare(b))).toEqual([
      "currentBranch",
      "headCommit",
    ]);
  });

  it("does not need Git when the CI gives the commit", async () => {
    git = new FakeGitClient("unavailable");

    const context = await detect({ GITLAB_CI: "true", CI_COMMIT_SHA: MERGE_SHA });

    expect(context.git.commitSha).toBe(MERGE_SHA);
  });
});

describe("detectRunContext on a local run", () => {
  it("reads the commit, branch and a clean tree from Git", async () => {
    const context = await detect({});

    expect(context).toEqual({
      git: { commitSha: "0123456789abcdef0123456789abcdef01234567", branch: "main", dirty: false },
      ci: { provider: "local" },
    });
  });

  it("marks a run with uncommitted changes as dirty", async () => {
    git = new FakeGitClient({ dirty: true });

    const context = await detect({});

    expect(context.git.dirty).toBe(true);
  });

  it("leaves out the branch on a detached HEAD", async () => {
    git = new FakeGitClient({ branch: undefined });

    const context = await detect({});

    expect(context.git).toEqual({
      commitSha: "0123456789abcdef0123456789abcdef01234567",
      dirty: false,
    });
  });

  it("fails with GIT_UNAVAILABLE and a hint when Git is not available", async () => {
    git = new FakeGitClient("unavailable");

    const error = await rejectedAtiumError(detect({}));

    expect(error.code).toBe("GIT_UNAVAILABLE");
    expect(error.hint).toBeDefined();
  });
});

describe("detectRunContext overrides", () => {
  it("lets ATIUM_COMMIT_SHA and ATIUM_BRANCH override what the CI provider says", async () => {
    const context = await detect({
      GITHUB_ACTIONS: "true",
      GITHUB_SHA: MERGE_SHA,
      GITHUB_REF_NAME: "main",
      ATIUM_COMMIT_SHA: HEAD_SHA,
      ATIUM_BRANCH: "release/2.0",
    });

    expect(context.git).toEqual({ commitSha: HEAD_SHA, branch: "release/2.0", dirty: false });
  });

  it("does not query Git in a local run when the commit is overridden", async () => {
    git = new FakeGitClient("unavailable");

    const context = await detect({ ATIUM_COMMIT_SHA: HEAD_SHA, ATIUM_BRANCH: "main" });

    expect(context).toEqual({
      git: { commitSha: HEAD_SHA, branch: "main", dirty: false },
      ci: { provider: "local" },
    });
    expect(git.queries).toEqual([]);
  });

  it("uses the overridden branch instead of asking Git for it", async () => {
    git = new FakeGitClient({ branch: "main" });

    const context = await detect({ ATIUM_BRANCH: "release/2.0" });

    expect(context.git.branch).toBe("release/2.0");
    expect(git.queries).not.toContain("currentBranch");
  });

  it("treats an empty override as not set", async () => {
    const context = await detect({ ATIUM_COMMIT_SHA: "", ATIUM_BRANCH: "" });

    expect(context.git).toEqual({
      commitSha: "0123456789abcdef0123456789abcdef01234567",
      branch: "main",
      dirty: false,
    });
  });
});

describe("detectRunContext output", () => {
  it("fits in a Run", async () => {
    const eventPath = await writeEvent({ pull_request: { number: 42, head: { sha: HEAD_SHA } } });
    const context = await detect({
      GITHUB_ACTIONS: "true",
      GITHUB_SHA: MERGE_SHA,
      GITHUB_HEAD_REF: "feature/login",
      GITHUB_BASE_REF: "main",
      GITHUB_RUN_ID: "1",
      GITHUB_RUN_ATTEMPT: "1",
      GITHUB_EVENT_PATH: eventPath,
    });

    expect(() => aRun().with(context).build()).not.toThrow();
  });

  it("fails with MODEL_INVALID when a variable is over the size cap of the run", async () => {
    const error = await rejectedAtiumError(detect({ ATIUM_COMMIT_SHA: "a".repeat(3000) }));

    expect(error.code).toBe("MODEL_INVALID");
    expect(error.message).toContain("commitSha");
    expect(error.hint).toContain("ATIUM_COMMIT_SHA");
  });
});
