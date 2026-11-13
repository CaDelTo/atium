// Run with `pnpm test:claude` (part of `pnpm verify`).
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { prArgs, SECRET_PATTERNS, secretProblem } from "./open-pr.mjs";

describe("secretProblem", () => {
  it("flags every secret pattern anywhere in the body", () => {
    for (const pattern of SECRET_PATTERNS) {
      assert.equal(secretProblem(`Closes #1\n\ntoken: ${pattern}abc123\n`), pattern);
    }
  });

  it("lets a clean body through", () => {
    assert.equal(secretProblem("Closes #52\n\n## What\nAdds the hard-wait rule.\n"), undefined);
  });
});

describe("prArgs", () => {
  const base = {
    branch: "feat/52-hard-wait-rule",
    title: "feat(eslint-plugin): add rule",
    bodyFile: "/tmp/b.md",
  };

  it("creates a draft PR against main when the branch has no open PR", () => {
    assert.deepEqual(prArgs({ ...base, loop: false }), [
      "pr",
      "create",
      "--draft",
      "--base",
      "main",
      "--head",
      "feat/52-hard-wait-rule",
      "--title",
      "feat(eslint-plugin): add rule",
      "--body-file",
      "/tmp/b.md",
    ]);
  });

  it("labels the PR created by the loop", () => {
    assert.deepEqual(prArgs({ ...base, loop: true }).slice(-2), ["--label", "loop"]);
  });

  it("updates only the body of the open PR, keeping the loop label", () => {
    assert.deepEqual(prArgs({ ...base, loop: true, existing: "77" }), [
      "pr",
      "edit",
      "77",
      "--body-file",
      "/tmp/b.md",
      "--add-label",
      "loop",
    ]);
  });

  it("refuses a branch that is not a task branch", () => {
    assert.throws(() => prArgs({ ...base, branch: "main", loop: false }), /not a task branch/);
  });
});
