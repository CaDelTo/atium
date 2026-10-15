import type { z } from "zod";
import { AtiumError } from "../errors.js";
import type { Logger } from "../logger.js";
import type { Run } from "../model/run.js";
import { RunSchema } from "../model/run.js";
import type { EnvVars } from "../env.js";
import { envValue } from "../env.js";
import { detectWithEnvCi } from "./env-ci-fallback.js";
import type { GitClient } from "./git-client.js";
import { readGitHubPullRequest } from "./github-event.js";
import type { GitHubPullRequest } from "./github-event.js";
import type { CiDetection } from "./providers.js";
import { detectKnownProvider, unknownCiDetection } from "./providers.js";
import { describeIssues } from "../zod-issues.js";

/** The `git` and `ci` sections of a {@link Run}. */
export interface RunContext {
  /** Commit and branch tested, and whether the tree had uncommitted changes. */
  readonly git: Run["git"];
  /** CI provider and run; `local` outside CI. */
  readonly ci: NonNullable<Run["ci"]>;
}

/** Options of {@link detectRunContext}. */
export interface DetectRunContextOptions {
  /** Environment variables, normally `process.env`. */
  readonly env: EnvVars;
  /** Working directory, absolute. */
  readonly cwd: string;
  /** Git of the repository under test, such as {@link createGitClient}. */
  readonly git: GitClient;
  /** Receives warnings about context that could not be read. */
  readonly logger: Logger;
}

/**
 * Value of `ci.provider` when Atium runs outside CI, on a developer machine
 * (02-data-model.md, step 6 of the run context).
 */
export const LOCAL_PROVIDER = "local";

const LOCAL = unknownCiDetection(LOCAL_PROVIDER);

const RunGitSchema = RunSchema.unwrap().shape.git;
const RunCiSchema = RunSchema.unwrap().shape.ci.unwrap();

/**
 * Detects the commit, branch and CI run being tested (02-data-model.md §10).
 *
 * The CI provider comes from Atium's own rules for GitHub Actions, GitLab CI,
 * Jenkins, CircleCI and Azure Pipelines; then, if `CI` is set, from env-ci;
 * otherwise the run is `local`. `ATIUM_COMMIT_SHA` and `ATIUM_BRANCH`
 * override what the provider says.
 *
 * Git is only queried when the commit is not known from the environment, so
 * a CI job without Git works. `dirty` is only checked in a local run; in CI
 * it is `false`.
 *
 * @param options - Environment, working directory, Git client and logger.
 * @returns The `git` and `ci` sections of the run.
 * @throws {@link AtiumError} `GIT_UNAVAILABLE` if the commit has to come from
 * Git and Git cannot give it, and `MODEL_INVALID` if a variable holds a value
 * the run cannot store, such as a branch name over the size cap.
 *
 * @example
 * ```ts
 * const { git, ci } = await detectRunContext({
 *   env: process.env,
 *   cwd: process.cwd(),
 *   git: createGitClient({ cwd: process.cwd() }),
 *   logger,
 * });
 * ```
 */
export async function detectRunContext(options: DetectRunContextOptions): Promise<RunContext> {
  const { env } = options;
  const detection = (await detectProvider(options)) ?? LOCAL;
  const pullRequest = await gitHubPullRequest(options, detection);
  const commitSha = envValue(env, "ATIUM_COMMIT_SHA") ?? detection.commitSha;
  const branch = envValue(env, "ATIUM_BRANCH") ?? detection.branch;
  const fromGit =
    commitSha === undefined
      ? await readGit(options.git, { branch, local: detection.provider === LOCAL_PROVIDER })
      : { commitSha, branch, dirty: false };
  return {
    git: validated(RunGitSchema, {
      commitSha: fromGit.commitSha,
      headSha: pullRequest?.headSha,
      branch: fromGit.branch,
      baseBranch: detection.baseBranch,
      dirty: fromGit.dirty,
    }),
    ci: validated(RunCiSchema, {
      provider: detection.provider,
      runId: detection.runId,
      runAttempt: detection.runAttempt,
      jobId: detection.jobId,
      prNumber: pullRequest?.number ?? detection.prNumber,
    }),
  };
}

async function detectProvider(options: DetectRunContextOptions): Promise<CiDetection | undefined> {
  return (
    detectKnownProvider(options.env) ??
    (envValue(options.env, "CI") === undefined ? undefined : await detectWithEnvCi(options))
  );
}

async function gitHubPullRequest(
  options: DetectRunContextOptions,
  detection: CiDetection,
): Promise<GitHubPullRequest | undefined> {
  const eventPath = envValue(options.env, "GITHUB_EVENT_PATH");
  if (detection.provider !== "github" || eventPath === undefined) {
    return undefined;
  }
  return readGitHubPullRequest({ eventPath, cwd: options.cwd, logger: options.logger });
}

interface GitState {
  readonly commitSha: string;
  readonly branch: string | undefined;
  readonly dirty: boolean;
}

async function readGit(
  git: GitClient,
  known: { readonly branch: string | undefined; readonly local: boolean },
): Promise<GitState> {
  const [commitSha, branch, dirty] = await Promise.all([
    git.headCommit(),
    known.branch ?? git.currentBranch(),
    known.local && git.isDirty(),
  ]);
  return { commitSha, branch, dirty };
}

/** Parses `value` without its `undefined` fields, which the model leaves out instead. */
function validated<T extends z.ZodType>(schema: T, value: Record<string, unknown>): z.output<T> {
  const defined = Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  );
  const parsed = schema.safeParse(defined);
  if (!parsed.success) {
    const issues = describeIssues(parsed.error.issues);
    throw new AtiumError(
      "MODEL_INVALID",
      `The commit, branch or CI run read from the environment cannot be stored in the run (${issues}).`,
      {
        cause: parsed.error,
        hint: "Check the CI variables for that field, or set ATIUM_COMMIT_SHA or ATIUM_BRANCH.",
      },
    );
  }
  return parsed.data;
}
