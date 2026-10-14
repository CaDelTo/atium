// Run with `pnpm test:claude` (part of `pnpm verify`).
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { credentialProblem, pushArgs } from "./push-branch.mjs";

describe("pushArgs", () => {
  it("pushes exactly the local task branch to the same branch on origin", () => {
    const args = pushArgs("feat/52-hard-wait-rule");

    assert.deepEqual(args.slice(args.indexOf("push")), [
      "push",
      "--set-upstream",
      "origin",
      "--",
      "refs/heads/feat/52-hard-wait-rule:refs/heads/feat/52-hard-wait-rule",
    ]);
  });

  it("uses the gh credential helper so a scoped GH_TOKEN is the one that pushes", () => {
    const args = pushArgs("docs/91-dev-loop");

    assert.deepEqual(args.slice(0, 4), [
      "-c",
      "credential.helper=",
      "-c",
      "credential.helper=!gh auth git-credential",
    ]);
  });

  const types = ["feat", "fix", "docs", "chore", "refactor", "test", "ci", "perf", "build"];

  for (const type of types) {
    it(`accepts a ${type} branch`, () => {
      assert.doesNotThrow(() => pushArgs(`${type}/7-some-name`));
    });
  }

  const rejected = [
    ["main", "main"],
    ["a refspec that targets main", "feat/1-x:main"],
    ["a deletion refspec", ":feat/1-x"],
    ["a forced refspec", "+feat/1-x"],
    ["a flag", "--force"],
    ["a flag after the branch", "feat/1-x --force"],
    ["two refspecs", "feat/1-x docs/2-y"],
    ["a branch without issue number", "feat/hard-wait-rule"],
    ["an unknown type", "hotfix/1-x"],
    ["uppercase letters", "feat/1-Hard-Wait"],
    ["a trailing hyphen", "feat/1-x-"],
    ["a path traversal", "feat/1-x/../main"],
    ["HEAD", "HEAD"],
    ["an empty name", ""],
    ["a trailing newline", "feat/1-x\n"],
  ];

  for (const [description, branch] of rejected) {
    it(`rejects ${description}`, () => {
      assert.throws(() => pushArgs(branch), /is not a task branch/);
    });
  }
});

describe("credentialProblem", () => {
  const httpsUrl = "https://github.com/CaDelTo/atium.git";

  it("allows an HTTPS GitHub origin outside the loop without GH_TOKEN", () => {
    assert.equal(credentialProblem({}, httpsUrl), undefined);
  });

  it("allows the loop to push when GH_TOKEN is set", () => {
    assert.equal(credentialProblem({ ATIUM_LOOP: "1", GH_TOKEN: "scoped" }, httpsUrl), undefined);
  });

  it("refuses to push from the loop without GH_TOKEN", () => {
    assert.match(credentialProblem({ ATIUM_LOOP: "1" }, httpsUrl), /GH_TOKEN is empty/);
  });

  it("refuses an SSH origin, which would bypass the gh credential helper", () => {
    assert.match(credentialProblem({}, "git@github.com:CaDelTo/atium.git"), /not to an https/);
  });

  it("refuses an HTTPS origin on another host", () => {
    assert.match(credentialProblem({}, "https://example.com/CaDelTo/atium.git"), /not to an https/);
  });
});
