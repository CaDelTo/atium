import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
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
});
