import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { rejectedAtiumError } from "../testing/thrown-error.js";
import { createGitClient } from "./git-client.js";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "atium-git-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

/** Prepares the repository under test with the system's Git, as simple-git runs it in production. */
function git(...args: string[]): string {
  return execFileSync(
    // eslint-disable-next-line sonarjs/no-os-command-from-path -- test setup that needs the same `git` from the PATH as the code under test
    "git",
    [
      "-c",
      "user.name=Atium",
      "-c",
      "user.email=atium@example.com",
      "-c",
      "init.defaultBranch=main",
      "-c",
      "advice.detachedHead=false",
      ...args,
    ],
    { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  ).trim();
}

async function repositoryWithOneCommit(): Promise<string> {
  git("init");
  await writeFile(path.join(dir, "login.spec.ts"), "test('logs in', () => {});\n");
  git("add", ".");
  git("commit", "-m", "Add login test");
  return git("rev-parse", "HEAD");
}

describe("createGitClient", () => {
  it("reads the commit and branch checked out", async () => {
    const sha = await repositoryWithOneCommit();
    const client = createGitClient({ cwd: dir });

    expect(await client.headCommit()).toBe(sha);
    expect(await client.currentBranch()).toBe("main");
  });

  it("returns no branch on a detached HEAD", async () => {
    const sha = await repositoryWithOneCommit();
    git("checkout", "--detach", sha);

    expect(await createGitClient({ cwd: dir }).currentBranch()).toBeUndefined();
  });

  it("reports a clean tree as not dirty", async () => {
    await repositoryWithOneCommit();

    expect(await createGitClient({ cwd: dir }).isDirty()).toBe(false);
  });

  it("reports a modified tracked file as dirty", async () => {
    await repositoryWithOneCommit();
    await writeFile(path.join(dir, "login.spec.ts"), "test('logs out', () => {});\n");

    expect(await createGitClient({ cwd: dir }).isDirty()).toBe(true);
  });

  it("reports an untracked file as dirty", async () => {
    await repositoryWithOneCommit();
    await writeFile(path.join(dir, "cart.spec.ts"), "test('adds to cart', () => {});\n");

    expect(await createGitClient({ cwd: dir }).isDirty()).toBe(true);
  });

  it("does not report an ignored file as dirty", async () => {
    await writeFile(path.join(dir, ".gitignore"), "test-results/\n");
    await repositoryWithOneCommit();
    await mkdir(path.join(dir, "test-results"));
    await writeFile(path.join(dir, "test-results", "report.json"), "{}");

    expect(await createGitClient({ cwd: dir }).isDirty()).toBe(false);
  });

  it("fails with GIT_UNAVAILABLE outside a repository", async () => {
    const error = await rejectedAtiumError(createGitClient({ cwd: dir }).headCommit());

    expect(error.code).toBe("GIT_UNAVAILABLE");
    expect(error.message).toContain("not a git repository");
    expect(error.hint).toContain("inside a Git repository");
    expect(error.cause).toBeDefined();
  });

  it("fails with GIT_UNAVAILABLE in a repository without commits", async () => {
    git("init");

    const error = await rejectedAtiumError(createGitClient({ cwd: dir }).headCommit());

    expect(error.code).toBe("GIT_UNAVAILABLE");
    expect(error.hint).toContain("at least one commit");
  });

  it("fails with GIT_UNAVAILABLE when the directory does not exist", async () => {
    const missing = path.join(dir, "missing");

    const error = await rejectedAtiumError(createGitClient({ cwd: missing }).isDirty());

    expect(error.code).toBe("GIT_UNAVAILABLE");
  });

  it("fails with GIT_UNAVAILABLE and names the variable when the env given has one simple-git blocks", async () => {
    await repositoryWithOneCommit();

    const error = await rejectedAtiumError(
      createGitClient({ cwd: dir, env: { PATH: process.env["PATH"], GIT_DIR: dir } }).headCommit(),
    );

    expect(error.code).toBe("GIT_UNAVAILABLE");
    expect(error.message).toContain('"GIT_DIR"');
    expect(error.hint).toBe(
      "Remove GIT_DIR from the env passed to createGitClient, or leave env out to use the current process's environment.",
    );
  });

  it("fails with GIT_UNAVAILABLE and an install hint when Git is not on the PATH", async () => {
    await repositoryWithOneCommit();

    const error = await rejectedAtiumError(
      createGitClient({ cwd: dir, env: { PATH: "", HOME: undefined } }).headCommit(),
    );

    expect(error.code).toBe("GIT_UNAVAILABLE");
    expect(error.message).toContain("not installed or not on the PATH");
    expect(error.hint).toContain("Install Git");
  });
});
