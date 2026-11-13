#!/usr/bin/env node
// Pushes a task branch and opens (or updates) its draft PR in one step
// (ADR-0026), so /deliver does not spend a turn per command. The body is
// scanned for secrets before anything is published; the push goes through
// push-branch.mjs, still the only way the agent pushes (ADR-0025).
//
// Usage: node .claude/scripts/open-pr.mjs <type>/<issue>-<name> <body-file> <title> [--loop]

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

import { TASK_BRANCH } from "./push-branch.mjs";

/** Token shapes that must never reach a PR (docs: /deliver, step 2). */
export const SECRET_PATTERNS = ["ghp_", "gho_", "github_pat_", "AKIA", "-----BEGIN"];

/**
 * Finds the first secret-like token in a text.
 *
 * @param {string} text Text about to be published.
 * @returns {string | undefined} The matched pattern, or `undefined` if the text is clean.
 */
export function secretProblem(text) {
  return SECRET_PATTERNS.find((pattern) => text.includes(pattern));
}

/**
 * Builds the `gh` arguments that create the draft PR, or update the body of
 * the open one.
 *
 * @param {{ branch: string, title: string, bodyFile: string, loop: boolean, existing?: string }} options
 *   `existing` is the number of the open PR for the branch, if there is one.
 * @returns {string[]} Arguments for `gh`.
 * @throws {Error} If `branch` is not a task branch.
 */
export function prArgs({ branch, title, bodyFile, loop, existing }) {
  if (!TASK_BRANCH.test(branch)) {
    throw new Error(`"${branch}" is not a task branch. Expected <type>/<issue>-<name>.`);
  }
  const label = loop ? ["--add-label", "loop"] : [];
  if (existing) return ["pr", "edit", existing, "--body-file", bodyFile, ...label];
  return [
    "pr",
    "create",
    "--draft",
    "--base",
    "main",
    "--head",
    branch,
    "--title",
    title,
    "--body-file",
    bodyFile,
    ...(loop ? ["--label", "loop"] : []),
  ];
}

function main(argv) {
  const loop = argv.includes("--loop");
  const args = argv.filter((arg) => arg !== "--loop");
  if (args.length !== 3) {
    console.error(
      "Usage: node .claude/scripts/open-pr.mjs <type>/<issue>-<name> <body-file> <title> [--loop]",
    );
    return 2;
  }
  const [branch, bodyFile, title] = args;
  const secret = secretProblem(readFileSync(bodyFile, "utf8"));
  if (secret) {
    console.error(
      `The PR body contains "${secret}", which looks like a secret. Nothing was published; remove it and retry.`,
    );
    return 2;
  }
  let ghArgs;
  try {
    ghArgs = prArgs({ branch, title, bodyFile, loop });
  } catch (error) {
    console.error(error.message);
    return 2;
  }
  const pushScript = fileURLToPath(new URL("./push-branch.mjs", import.meta.url));
  try {
    execFileSync(process.execPath, [pushScript, branch], { stdio: "inherit" });
    const existing = execFileSync(
      "gh",
      [
        "pr",
        "list",
        "--head",
        branch,
        "--state",
        "open",
        "--json",
        "number",
        "--jq",
        ".[0].number // empty",
      ],
      { encoding: "utf8" },
    ).trim();
    if (existing) ghArgs = prArgs({ branch, title, bodyFile, loop, existing });
    execFileSync("gh", ghArgs, { stdio: "inherit" });
    if (existing) console.log(`Updated PR #${existing}.`);
    return 0;
  } catch (error) {
    return typeof error.status === "number" ? error.status : 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main(process.argv.slice(2));
}
