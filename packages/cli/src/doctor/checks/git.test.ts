import { FakeGitClient, FakeLogger } from "@atium/core/testing";
import type { GitClient } from "@atium/core";
import { describe, expect, it } from "vitest";
import { checkGit } from "./git.js";

const COMMIT = "0123456789abcdef0123456789abcdef01234567";

describe("checkGit", () => {
  it("passes with the branch and commit checked out", async () => {
    const check = await checkGit({
      git: new FakeGitClient(),
      needed: true,
      logger: new FakeLogger(),
    });

    expect(check).toEqual({
      id: "git",
      status: "pass",
      message: `Git repository on the branch "main" at ${COMMIT}.`,
      details: { commit: COMMIT, branch: "main" },
    });
  });

  it("passes on a detached HEAD", async () => {
    const check = await checkGit({
      git: new FakeGitClient({ branch: undefined }),
      needed: true,
      logger: new FakeLogger(),
    });

    expect(check.status).toBe("pass");
    expect(check.message).toBe(`Git repository at ${COMMIT}, on a detached HEAD.`);
    expect(check.details).toEqual({ commit: COMMIT, branch: null });
  });

  it("fails with the hint of the error when a run needs Git and it is not available", async () => {
    const logger = new FakeLogger();

    const check = await checkGit({
      git: new FakeGitClient("unavailable"),
      needed: true,
      logger,
    });

    expect(check).toEqual({
      id: "git",
      status: "fail",
      message: "Git is not available in this fake.",
      hint: "Pass a state to FakeGitClient.",
      details: { commit: null, branch: null },
    });
    expect(logger.entries.map(({ level }) => level)).toEqual(["debug"]);
  });

  it("only warns, with its own hint, when a run does not need Git", async () => {
    const check = await checkGit({
      git: new FakeGitClient("unavailable"),
      needed: false,
      logger: new FakeLogger(),
    });

    expect(check.status).toBe("warn");
    expect(check.message).toBe(
      "Git is not available in this fake. Atium does not need Git here, because the commit comes from the environment.",
    );
    expect(check.hint).toBe(
      "Nothing to fix for runs where the commit comes from the environment; install Git and run Atium inside a repository to use it elsewhere.",
    );
  });

  it("rethrows an error that is not GIT_UNAVAILABLE", async () => {
    const broken = new Error("bug");
    const git: GitClient = {
      headCommit: () => Promise.reject(broken),
      currentBranch: () => Promise.resolve("main"),
      isDirty: () => Promise.resolve(false),
    };

    await expect(checkGit({ git, needed: true, logger: new FakeLogger() })).rejects.toBe(broken);
  });
});
