import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MODEL_TEXT_CAPS_BYTES } from "../defaults.js";
import { FakeLogger } from "../testing/fake-logger.js";
import { rejectedAtiumError } from "../testing/thrown-error.js";
import { detectRunContext } from "./detect-run-context.js";
import { RecordingGitClient } from "./fakes.test-support.js";

let cwd: string;
let logger: FakeLogger;

beforeEach(async () => {
  cwd = await mkdtemp(path.join(tmpdir(), "atium-ci-git-"));
  logger = new FakeLogger();
});

afterEach(async () => {
  await rm(cwd, { recursive: true, force: true });
});

describe("detectRunContext Git queries", () => {
  it("AC-1: queries Git one at a time in a local run", async () => {
    const recording = new RecordingGitClient();

    await detectRunContext({ env: {}, cwd, git: recording, logger });

    expect(recording.events).toEqual([
      "start:headCommit",
      "end:headCommit",
      "start:currentBranch",
      "end:currentBranch",
      "start:isDirty",
      "end:isDirty",
    ]);
  });

  it("AC-1: stops querying Git after the first failure", async () => {
    const recording = new RecordingGitClient("headCommit");

    const error = await rejectedAtiumError(
      detectRunContext({ env: {}, cwd, git: recording, logger }),
    );

    expect(error.code).toBe("GIT_UNAVAILABLE");
    expect(recording.events).toEqual(["start:headCommit", "end:headCommit"]);
  });

  it("does not query isDirty when the branch query fails", async () => {
    const recording = new RecordingGitClient("currentBranch");

    const error = await rejectedAtiumError(
      detectRunContext({ env: {}, cwd, git: recording, logger }),
    );

    expect(error.code).toBe("GIT_UNAVAILABLE");
    expect(recording.events).toEqual([
      "start:headCommit",
      "end:headCommit",
      "start:currentBranch",
      "end:currentBranch",
    ]);
  });

  it("skips the branch query in a local run when the environment gives the branch", async () => {
    const recording = new RecordingGitClient();

    const { git } = await detectRunContext({
      env: { ATIUM_BRANCH: "feature/x" },
      cwd,
      git: recording,
      logger,
    });

    expect(git.branch).toBe("feature/x");
    expect(recording.events).toEqual([
      "start:headCommit",
      "end:headCommit",
      "start:isDirty",
      "end:isDirty",
    ]);
  });

  it("does not query Git at all when the environment gives the commit", async () => {
    const recording = new RecordingGitClient();
    const sha = "0123456789abcdef0123456789abcdef01234567";

    await detectRunContext({
      env: { ATIUM_COMMIT_SHA: sha, ATIUM_BRANCH: "main" },
      cwd,
      git: recording,
      logger,
    });

    expect(recording.events).toEqual([]);
  });
});

describe("detectRunContext pull request head commit size", () => {
  const github = { GITHUB_ACTIONS: "true", GITHUB_SHA: "a".repeat(40) };
  const cap = MODEL_TEXT_CAPS_BYTES.default;

  async function detectWithHead(sha: string) {
    const eventPath = path.join(cwd, "event.json");
    await writeFile(eventPath, JSON.stringify({ pull_request: { number: 42, head: { sha } } }));
    return detectRunContext({
      env: { ...github, GITHUB_EVENT_PATH: eventPath },
      cwd,
      git: new RecordingGitClient(),
      logger,
    });
  }

  it.each([
    ["multibyte characters", "é".repeat(cap / 2 + 1)],
    ["control characters escaped as \\u00XX", "\u0001".repeat(Math.ceil(cap / 6) + 1)],
  ])("treats a head commit over the cap in escaped bytes as too long: %s", async (_name, sha) => {
    expect(sha.length).toBeLessThan(cap);

    const context = await detectWithHead(sha);

    expect(context.git.headSha).toBeUndefined();
    expect(context.ci.prNumber).toBeUndefined();
  });

  it("keeps a multibyte head commit that is exactly the cap in bytes", async () => {
    const sha = "é".repeat(cap / 2);

    const context = await detectWithHead(sha);

    expect(context.git.headSha).toBe(sha);
  });

  it("warns about an oversized head commit with the usual message and without its value", async () => {
    const sha = "secret-".repeat(cap);

    await detectWithHead(sha);

    const [entry, ...rest] = logger.entries;
    expect(rest).toEqual([]);
    expect(entry?.message).toContain("unexpected pull request");
    expect(JSON.stringify(entry)).not.toContain("secret-");
  });
});
