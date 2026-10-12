import { describe, expect, it } from "vitest";
import { FakeGitClient } from "./fake-git-client.js";
import { rejectedAtiumError } from "./thrown-error.js";

describe("FakeGitClient", () => {
  it("answers with a clean main branch at a fixed commit by default", async () => {
    const git = new FakeGitClient();

    expect(await git.headCommit()).toBe("0123456789abcdef0123456789abcdef01234567");
    expect(await git.currentBranch()).toBe("main");
    expect(await git.isDirty()).toBe(false);
  });

  it("answers with the state it was given and records every query in order", async () => {
    const git = new FakeGitClient({ branch: undefined, dirty: true });

    expect(await git.isDirty()).toBe(true);
    expect(await git.currentBranch()).toBeUndefined();
    expect(git.queries).toEqual(["isDirty", "currentBranch"]);
  });

  it("rejects every query with GIT_UNAVAILABLE when unavailable", async () => {
    const git = new FakeGitClient("unavailable");

    for (const query of [git.headCommit(), git.currentBranch(), git.isDirty()]) {
      expect((await rejectedAtiumError(query)).code).toBe("GIT_UNAVAILABLE");
    }
    expect(git.queries).toEqual(["headCommit", "currentBranch", "isDirty"]);
  });
});
