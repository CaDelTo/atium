import type { EnvVars, GitClient } from "@atium/core";
import { FakeGitClient, FakeLogger } from "@atium/core/testing";
import { describe, expect, it } from "vitest";
import type { DoctorCheckOf } from "../report.js";
import { checkCi } from "./ci.js";

const COMMIT = "0123456789abcdef0123456789abcdef01234567";
const CI_COMMIT = "fedcba9876543210fedcba9876543210fedcba98";

function detect(env: EnvVars, git: GitClient = new FakeGitClient()): ReturnType<typeof checkCi> {
  return checkCi({ env, cwd: "/project", git, logger: new FakeLogger() });
}

async function check(env: EnvVars, git?: GitClient): Promise<DoctorCheckOf<"ci">> {
  return (await detect(env, git)).check;
}

describe("checkCi", () => {
  it("passes outside CI with the commit and branch from Git", async () => {
    expect(await check({})).toEqual({
      id: "ci",
      status: "pass",
      message: `Local run, not in CI: commit ${COMMIT} on "main".`,
      details: {
        git: { commitSha: COMMIT, branch: "main", dirty: false },
        ci: { provider: "local" },
      },
    });
  });

  it("says when the working tree has uncommitted changes", async () => {
    const result = await check({}, new FakeGitClient({ dirty: true }));

    expect(result.message).toBe(
      `Local run, not in CI: commit ${COMMIT} on "main", with uncommitted changes.`,
    );
  });

  it("shows the provider, run and pull request in CI", async () => {
    const result = await check(
      {
        GITLAB_CI: "true",
        CI_COMMIT_SHA: CI_COMMIT,
        CI_COMMIT_REF_NAME: "feature",
        CI_PIPELINE_ID: "991",
        CI_MERGE_REQUEST_IID: "12",
      },
      new FakeGitClient("unavailable"),
    );

    expect(result.status).toBe("pass");
    expect(result.message).toBe(
      `CI provider "gitlab", run "991", pull request #12: commit ${CI_COMMIT} on "feature".`,
    );
    expect(result.details?.ci).toEqual({ provider: "gitlab", runId: "991", prNumber: 12 });
  });

  it("leaves out the run and the branch when the provider does not give them", async () => {
    const result = await check(
      { GITLAB_CI: "true", CI_COMMIT_SHA: CI_COMMIT },
      new FakeGitClient("unavailable"),
    );

    expect(result.message).toBe(`CI provider "gitlab": commit ${CI_COMMIT}.`);
  });

  it("fails with the hint of the error when the commit needs Git and Git is not available", async () => {
    const result = await check({}, new FakeGitClient("unavailable"));

    expect(result).toEqual({
      id: "ci",
      status: "fail",
      message:
        "The commit, branch and CI run could not be detected. Git is not available in this fake.",
      hint: "Pass a state to FakeGitClient.",
      details: null,
    });
  });

  it("fails when a variable holds a value a run cannot store", async () => {
    const result = await check({ ATIUM_COMMIT_SHA: CI_COMMIT, ATIUM_BRANCH: "b".repeat(100_000) });

    expect(result.status).toBe("fail");
    expect(result.hint).toBe(
      "Check the CI variables for that field, or set ATIUM_COMMIT_SHA or ATIUM_BRANCH.",
    );
  });

  it("tells that a run needs Git only when the commit had to come from it and could not", async () => {
    expect((await detect({})).needsGit).toBe(false);
    expect((await detect({}, new FakeGitClient("unavailable"))).needsGit).toBe(true);
    expect(
      (await detect({ ATIUM_COMMIT_SHA: CI_COMMIT }, new FakeGitClient("unavailable"))).needsGit,
    ).toBe(false);
  });

  it("does not ask for Git when the commit comes from the environment and another value is invalid", async () => {
    const result = await detect(
      { ATIUM_COMMIT_SHA: CI_COMMIT, ATIUM_BRANCH: "b".repeat(100_000) },
      new FakeGitClient("unavailable"),
    );

    expect(result.check.status).toBe("fail");
    expect(result.needsGit).toBe(false);
  });

  it("rethrows an error that is not about the context", async () => {
    const broken = new Error("bug");
    const git: GitClient = {
      headCommit: () => Promise.reject(broken),
      currentBranch: () => Promise.resolve("main"),
      isDirty: () => Promise.resolve(false),
    };

    await expect(check({}, git)).rejects.toBe(broken);
  });
});
