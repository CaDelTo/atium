import { detectRunContext, isAtiumError, quoteForMessage } from "@atium/core";
import type { AtiumError, DetectRunContextOptions, RunContext } from "@atium/core";
import { DOCTOR } from "../../messages.js";
import type { DoctorCheckOf } from "../report.js";
import { errorOutcome } from "./error-outcome.js";

/** `ci.provider` outside CI (02-data-model.md §10.1). */
const LOCAL_PROVIDER = "local";

/** The `ci` check and what it tells about Git. */
export interface CiCheckResult {
  /** The check. */
  readonly check: DoctorCheckOf<"ci">;
  /**
   * Whether the commit had to come from Git and Git could not give it. When
   * `false`, a run does not need Git: the commit came from the environment,
   * or Git answered.
   */
  readonly needsGit: boolean;
}

/**
 * The `ci` check: the commit, branch and CI run that a run would record,
 * detected as `detectRunContext` does (02-data-model.md §10.1).
 *
 * @param options - Environment, working directory, Git client and logger.
 * @returns `pass` with the context, or `fail` with the error and its hint if
 * the commit cannot be known or a variable holds a value a run cannot store.
 * @throws Any other error of `detectRunContext`.
 */
export async function checkCi(options: DetectRunContextOptions): Promise<CiCheckResult> {
  let context: RunContext;
  try {
    context = await detectRunContext(options);
  } catch (error) {
    if (!isContextError(error)) {
      throw error;
    }
    const { message, hint } = errorOutcome(error, DOCTOR.ci.failedHint, options.logger);
    return {
      check: { id: "ci", status: "fail", message: DOCTOR.ci.failed(message), hint, details: null },
      needsGit: error.code === "GIT_UNAVAILABLE",
    };
  }
  return {
    check: { id: "ci", status: "pass", message: describe(context), details: context },
    needsGit: false,
  };
}

function describe({ git, ci }: RunContext): string {
  return DOCTOR.ci.detected({
    where: where(ci),
    commit: git.commitSha,
    branch: git.branch === undefined ? undefined : quoteForMessage(git.branch),
    dirty: git.dirty,
  });
}

function where(ci: RunContext["ci"]): string {
  if (ci.provider === LOCAL_PROVIDER) {
    return DOCTOR.ci.local;
  }
  const run = ci.runId === undefined ? undefined : quoteForMessage(ci.runId);
  return DOCTOR.ci.provider(quoteForMessage(ci.provider), run, ci.prNumber);
}

function isContextError(error: unknown): error is AtiumError {
  return (
    isAtiumError(error) && (error.code === "GIT_UNAVAILABLE" || error.code === "MODEL_INVALID")
  );
}
