import { AtiumError } from "../errors.js";
import { quoteForMessage } from "../quote.js";
import type { EnvVars } from "../env.js";

// I/O edge of `core`: the only place that runs Git (02-code-design.md).

/**
 * The Git queries {@link detectRunContext} needs, injected so it can be
 * tested without a repository.
 *
 * Every method throws an {@link AtiumError} `GIT_UNAVAILABLE` when Git is not
 * installed, the directory is not a repository or it has no commits yet.
 */
export interface GitClient {
  /** Full SHA of the commit checked out (`git rev-parse HEAD`). */
  headCommit(): Promise<string>;
  /** Branch checked out, or `undefined` on a detached HEAD (`git branch --show-current`). */
  currentBranch(): Promise<string | undefined>;
  /** Whether the working tree has changes not committed yet, untracked files included. */
  isDirty(): Promise<boolean>;
}

/** Options of {@link createGitClient}. */
export interface CreateGitClientOptions {
  /** Directory of the repository, or any directory inside it. */
  readonly cwd: string;
  /**
   * Environment of the `git` process, which replaces the current process's
   * instead of extending it. simple-git rejects variables that make Git run
   * other programs or read another repository, such as `GIT_EDITOR`,
   * `GIT_PAGER` or `GIT_DIR`; with one of them every query throws
   * `GIT_UNAVAILABLE`. Defaults to the current process's environment, which
   * is not checked.
   */
  readonly env?: EnvVars;
}

/**
 * Creates a {@link GitClient} backed by the `git` binary, through simple-git.
 * simple-git is imported on the first query, so creating the client is cheap.
 *
 * @param options - Repository directory and, optionally, the environment of
 * the `git` process.
 * @returns A client that runs one `git` command per query. Its queries throw
 * {@link AtiumError} `GIT_UNAVAILABLE` as described in {@link GitClient}.
 *
 * @example
 * ```ts
 * const git = createGitClient({ cwd: process.cwd() });
 * const commit = await git.headCommit();
 * ```
 */
export function createGitClient(options: CreateGitClientOptions): GitClient {
  const run = async (args: readonly string[]): Promise<string> => {
    try {
      const { simpleGit } = await import("simple-git");
      const git = simpleGit({ baseDir: options.cwd });
      return await (options.env === undefined ? git : git.env(toProcessEnv(options.env))).raw([
        ...args,
      ]);
    } catch (error) {
      throw gitUnavailable(options.cwd, error);
    }
  };
  return {
    headCommit: async () => (await run(["rev-parse", "--verify", "HEAD"])).trim(),
    currentBranch: async () => {
      const branch = (await run(["branch", "--show-current"])).trim();
      return branch === "" ? undefined : branch;
    },
    isDirty: async () => (await run(["status", "--porcelain"])).trim() !== "",
  };
}

function toProcessEnv(env: EnvVars): Record<string, string> {
  const defined: Record<string, string> = {};
  for (const [name, value] of Object.entries(env)) {
    if (value !== undefined) {
      defined[name] = value;
    }
  }
  return defined;
}

function gitUnavailable(cwd: string, error: unknown): AtiumError {
  const detail = error instanceof Error ? firstLine(error.message) : String(error);
  const where = quoteForMessage(cwd);
  const { message, hint } = explain(detail, where);
  return new AtiumError("GIT_UNAVAILABLE", message, { cause: error, hint });
}

/** What went wrong, from the first line of simple-git's error, which is all it gives. */
function explain(detail: string, where: string): { message: string; hint: string } {
  const blocked = /^Use of "([^"]+)" is (?:not permitted|blocked)/.exec(detail)?.[1];
  if (blocked !== undefined) {
    return {
      message: `Did not run Git in ${where} because the environment given to it has ${quoteForMessage(blocked)}, which simple-git blocks (${detail}).`,
      hint: `Remove ${blocked} from the env passed to createGitClient, or leave env out to use the current process's environment.`,
    };
  }
  if (/\bENOENT\b/.test(detail)) {
    return {
      message: `Could not run Git in ${where} because it is not installed or not on the PATH (${detail}).`,
      hint: "Install Git and make sure it is on the PATH, or set ATIUM_COMMIT_SHA.",
    };
  }
  return {
    message: `Could not read the Git repository in ${where}: ${detail}`,
    hint: "Run Atium inside a Git repository with at least one commit, or set ATIUM_COMMIT_SHA.",
  };
}

function firstLine(message: string): string {
  const lines = message.split("\n").map((line) => line.trim());
  return lines.find((line) => line.startsWith("fatal:")) ?? lines.find((line) => line !== "") ?? "";
}
