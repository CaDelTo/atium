#!/usr/bin/env node
// Pushes one task branch to origin. It is the only way the agent pushes
// (ADR-0025): `git push` stays denied in the permissions, and this script
// validates the branch name and builds the refspec itself, so no flag, extra
// refspec, deletion or `main` can reach `git push`.
//
// Usage: node .claude/scripts/push-branch.mjs <type>/<issue>-<name>
//
// Credentials come from `gh auth git-credential`, which honours GH_TOKEN: a
// session started with a scoped token pushes with that token. With
// ATIUM_LOOP=1 (the /dev-loop session) GH_TOKEN is required, so the loop never
// falls back to the person's own credentials.

import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

/** Task branch names (docs/engineering/08-git-workflow.md, "Ramas"). */
export const TASK_BRANCH =
  /^(feat|fix|docs|chore|refactor|test|ci|perf|build)\/\d+-[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Push URLs the credential helper applies to (an SSH remote would bypass it). */
export const HTTPS_GITHUB_URL = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+?(?:\.git)?$/;

/**
 * Checks that the push will use the expected credentials.
 *
 * @param {Record<string, string | undefined>} env Process environment.
 * @param {string} pushUrl Push URL of origin (`git remote get-url --push origin`).
 * @returns {string | undefined} Why the push must not run, or `undefined` if it can.
 */
export function credentialProblem(env, pushUrl) {
  if (!HTTPS_GITHUB_URL.test(pushUrl)) {
    return `origin pushes to "${pushUrl}", not to an https://github.com URL, so the gh credential helper would not be used. Point origin at the HTTPS URL.`;
  }
  if (env.ATIUM_LOOP === "1" && !env.GH_TOKEN) {
    return "ATIUM_LOOP=1 but GH_TOKEN is empty: the loop must push with its scoped token. Start the session as described in docs/engineering/12-ai-workflow.md, \"Loop de desarrollo\".";
  }
  return undefined;
}

/**
 * Builds the `git` arguments that push `branch` to the branch of the same name
 * on origin and set it as upstream.
 *
 * @param {string} branch Local branch name.
 * @returns {string[]} Arguments for `git`.
 * @throws {Error} If `branch` is not a task branch.
 */
export function pushArgs(branch) {
  if (!TASK_BRANCH.test(branch)) {
    throw new Error(
      `"${branch}" is not a task branch. Expected <type>/<issue>-<name>, for example ` +
        `feat/52-hard-wait-rule (docs/engineering/08-git-workflow.md, "Ramas").`,
    );
  }
  const ref = `refs/heads/${branch}`;
  return [
    "-c",
    "credential.helper=",
    "-c",
    "credential.helper=!gh auth git-credential",
    "push",
    "--set-upstream",
    "origin",
    "--",
    `${ref}:${ref}`,
  ];
}

function main(argv) {
  if (argv.length !== 1) {
    console.error("Usage: node .claude/scripts/push-branch.mjs <type>/<issue>-<name>");
    return 2;
  }
  const [branch] = argv;
  let args;
  try {
    args = pushArgs(branch);
  } catch (error) {
    console.error(error.message);
    return 2;
  }
  try {
    execFileSync("git", ["rev-parse", "--verify", "--quiet", `refs/heads/${branch}`], {
      stdio: "ignore",
    });
  } catch {
    console.error(`Local branch "${branch}" does not exist. Create it before pushing.`);
    return 2;
  }
  const pushUrl = execFileSync("git", ["remote", "get-url", "--push", "origin"], {
    encoding: "utf8",
  }).trim();
  const problem = credentialProblem(process.env, pushUrl);
  if (problem) {
    console.error(problem);
    return 2;
  }
  try {
    execFileSync("git", args, { stdio: "inherit" });
    return 0;
  } catch (error) {
    return typeof error.status === "number" ? error.status : 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main(process.argv.slice(2));
}
