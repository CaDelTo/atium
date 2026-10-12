import { describe, expect, it } from "vitest";
import { FakeLogger } from "../testing/fake-logger.js";
import { detectWithEnvCi } from "./env-ci-fallback.js";

function detectWith(result: unknown, logger = new FakeLogger()) {
  return detectWithEnvCi({ env: {}, cwd: "/repo", logger, envCi: () => result });
}

describe("detectWithEnvCi", () => {
  it("maps a branch build, accepting numbers where env-ci gives them", async () => {
    const detection = await detectWith({
      service: "buildkite",
      commit: "abc123",
      branch: "main",
      isPr: false,
      build: 17,
      job: "",
    });

    expect(detection).toEqual({
      provider: "buildkite",
      commitSha: "abc123",
      branch: "main",
      baseBranch: undefined,
      runId: "17",
      runAttempt: undefined,
      jobId: undefined,
      prNumber: undefined,
    });
  });

  it("takes the head branch from prBranch and the base from branch in a pull request", async () => {
    const detection = await detectWith({
      service: "bitbucket",
      branch: "main",
      prBranch: "feature/login",
      isPr: true,
      pr: 8,
    });

    expect(detection).toMatchObject({ branch: "feature/login", baseBranch: "main", prNumber: 8 });
  });

  it("returns nothing when env-ci recognizes no service", async () => {
    const logger = new FakeLogger();

    expect(await detectWith({ isCi: true, commit: "abc123" }, logger)).toBeUndefined();
    expect(logger.entries).toEqual([]);
  });

  it("warns and returns nothing when env-ci returns an unexpected result", async () => {
    const logger = new FakeLogger();

    expect(await detectWith({ service: 42 }, logger)).toBeUndefined();
    expect(logger.entries.map((entry) => entry.message)).toEqual([
      "env-ci returned an unexpected result; the run is saved as local",
    ]);
  });

  it("warns and returns nothing when env-ci throws", async () => {
    const logger = new FakeLogger();
    const failure = new Error("Cannot read the event file");

    const detection = await detectWithEnvCi({
      env: {},
      cwd: "/repo",
      logger,
      envCi: () => {
        throw failure;
      },
    });

    expect(detection).toBeUndefined();
    expect(logger.entries).toEqual([
      {
        level: "warn",
        message: "Could not detect the CI provider; the run is saved as local",
        context: { error: failure },
      },
    ]);
  });
});
