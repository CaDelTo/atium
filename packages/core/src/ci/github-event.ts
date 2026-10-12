import { open } from "node:fs/promises";
import * as path from "node:path";
import { z } from "zod";
import { GITHUB_EVENT_MAX_BYTES } from "../defaults.js";
import type { Logger } from "../logger.js";

// I/O edge of `core`: reads the event payload GitHub Actions writes for each
// job (02-code-design.md).

/** The pull request of a GitHub Actions run, from its event payload. */
export interface GitHubPullRequest {
  /** Number of the pull request, `pull_request.number`. */
  readonly number: number;
  /** Head commit of the pull request, if the payload has one. */
  readonly headSha: string | undefined;
}

/** The part of the payload Atium reads; the rest is ignored. */
const PullRequestEventSchema = z.looseObject({
  pull_request: z
    .looseObject({
      number: z.int().positive(),
      head: z.looseObject({ sha: z.string().min(1) }).optional(),
    })
    .optional(),
});

/** Options of {@link readGitHubPullRequest}. */
export interface ReadGitHubPullRequestOptions {
  /** Value of `GITHUB_EVENT_PATH`, absolute or relative to `cwd`. */
  readonly eventPath: string;
  /** Working directory. */
  readonly cwd: string;
  /** Receives a warning when the payload cannot be read. */
  readonly logger: Logger;
}

/**
 * Reads the pull request from the event payload of a GitHub Actions run.
 *
 * The payload only adds the pull request number and head commit, so a payload
 * that cannot be read or parsed is logged as a warning instead of failing the
 * run.
 *
 * @param options - Where the payload is and where to warn.
 * @returns The pull request, or `undefined` if the event is not about one or
 * the payload cannot be read.
 */
export async function readGitHubPullRequest(
  options: ReadGitHubPullRequestOptions,
): Promise<GitHubPullRequest | undefined> {
  // Not `resolveInside`: the runner writes the payload outside the repository,
  // such as `/home/runner/work/_temp/_github_workflow/event.json`.
  const file = path.resolve(options.cwd, options.eventPath);
  let text: string | undefined;
  try {
    text = await readCapped(file);
  } catch (error) {
    options.logger.warn(
      "Could not read the GitHub event payload; the run is saved without the pull request number and head commit",
      { file, error },
    );
    return undefined;
  }
  if (text === undefined) {
    options.logger.warn(
      "The GitHub event payload is too large to read; the run is saved without the pull request number and head commit",
      { file, maxBytes: GITHUB_EVENT_MAX_BYTES },
    );
    return undefined;
  }
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch (error) {
    options.logger.warn(
      "The GitHub event payload is not valid JSON; the run is saved without the pull request number and head commit",
      // Only the error name: a JSON syntax error quotes part of the payload.
      { file, error: error instanceof Error ? error.name : typeof error },
    );
    return undefined;
  }
  const parsed = PullRequestEventSchema.safeParse(payload);
  if (!parsed.success) {
    options.logger.warn(
      "The GitHub event payload has an unexpected pull request; the run is saved without its number and head commit",
      { file, issues: parsed.error.issues },
    );
    return undefined;
  }
  const pullRequest = parsed.data.pull_request;
  return pullRequest === undefined
    ? undefined
    : { number: pullRequest.number, headSha: pullRequest.head?.sha };
}

/**
 * Reads `file` as UTF-8 if it is at most {@link GITHUB_EVENT_MAX_BYTES}.
 * The size is checked on the same open file that is read, so the file cannot
 * be swapped in between.
 */
async function readCapped(file: string): Promise<string | undefined> {
  const handle = await open(file, "r");
  try {
    const { size } = await handle.stat();
    return size > GITHUB_EVENT_MAX_BYTES ? undefined : await handle.readFile("utf8");
  } finally {
    await handle.close();
  }
}
