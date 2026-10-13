import { isAtiumError, quoteForMessage } from "@atium/core";
import type { AtiumError, GitClient, Logger } from "@atium/core";
import { DOCTOR, ERRORS } from "../../messages.js";
import type { DoctorCheckOf } from "../report.js";
import { errorOutcome } from "./error-outcome.js";

/** Options of {@link checkGit}. */
export interface CheckGitOptions {
  /** Git of the working directory. */
  readonly git: GitClient;
  /**
   * Whether a run needs Git: `false` when the `ci` check got the commit from
   * the environment, such as `ATIUM_COMMIT_SHA` or the CI provider.
   */
  readonly needed: boolean;
  /** Receives the error, at debug level. */
  readonly logger: Logger;
}

/**
 * The `git` check: Git is installed and the working directory is a
 * repository with at least one commit.
 *
 * @param options - Git client, whether a run needs it, and logger.
 * @returns `pass` with the branch and commit. Without Git, `fail` with the
 * hint of the error if a run needs it, or else `warn`.
 * @throws Any error of the client that is not `GIT_UNAVAILABLE`.
 */
export async function checkGit(options: CheckGitOptions): Promise<DoctorCheckOf<"git">> {
  try {
    // One after the other: if the first fails, no other `git` process is
    // left running in the directory (on Windows it would keep it locked).
    const commit = await options.git.headCommit();
    const branch = await options.git.currentBranch();
    return {
      id: "git",
      status: "pass",
      message: DOCTOR.git.found(commit, branch === undefined ? undefined : quoteForMessage(branch)),
      details: { commit, branch: branch ?? null },
    };
  } catch (error) {
    if (!isGitUnavailable(error)) {
      throw error;
    }
    const details = { commit: null, branch: null };
    if (options.needed) {
      return {
        id: "git",
        status: "fail",
        ...errorOutcome(error, DOCTOR.git.unavailableHint, options.logger),
        details,
      };
    }
    options.logger.debug(ERRORS.details, { error });
    return {
      id: "git",
      status: "warn",
      message: DOCTOR.git.notNeeded(error.message),
      hint: DOCTOR.git.notNeededHint,
      details,
    };
  }
}

function isGitUnavailable(error: unknown): error is AtiumError {
  return isAtiumError(error) && error.code === "GIT_UNAVAILABLE";
}
