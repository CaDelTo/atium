import type { EnvVars } from "../env.js";
import { envValue } from "../env.js";
import { envPositiveInt, toPositiveInt } from "./env.js";

/**
 * What a CI provider tells about the run through its environment variables
 * (02-data-model.md §10). Unknown values are `undefined`.
 */
export interface CiDetection {
  /** Value of `ci.provider`, such as `github`, `gitlab`, `jenkins`, `circleci`, `azure` or `local`. */
  readonly provider: string;
  /** Commit tested; in a pull request, the merge commit when the provider builds one. */
  readonly commitSha: string | undefined;
  /** Branch tested; in a pull request, its head branch. */
  readonly branch: string | undefined;
  /** Target branch of the pull request. */
  readonly baseBranch: string | undefined;
  /** Identifier of the pipeline, workflow or build run. */
  readonly runId: string | undefined;
  /** Re-run of the same workflow, starting at 1. */
  readonly runAttempt: number | undefined;
  /** Identifier of the job inside the run. */
  readonly jobId: string | undefined;
  /** Number of the pull or merge request. */
  readonly prNumber: number | undefined;
}

/**
 * A detection of `provider` that knows nothing else about the run.
 *
 * @param provider - Value of `ci.provider`.
 * @returns The detection, with every other field `undefined`.
 */
export function unknownCiDetection(provider: string): CiDetection {
  return {
    provider,
    commitSha: undefined,
    branch: undefined,
    baseBranch: undefined,
    runId: undefined,
    runAttempt: undefined,
    jobId: undefined,
    prNumber: undefined,
  };
}

/** A CI provider with rules of its own, taken from the table of 02-data-model.md §10. */
interface KnownProvider {
  /** Value of `ci.provider`. */
  readonly name: string;
  /** Variable that only this provider defines. */
  readonly detectedBy: string;
  /** Reads the run from the provider's variables. */
  read(env: EnvVars): Partial<Omit<CiDetection, "provider">>;
}

// Same detection variables as env-ci, so both agree on which CI is running.
const KNOWN_PROVIDERS: readonly KnownProvider[] = [
  {
    name: "github",
    detectedBy: "GITHUB_ACTIONS",
    // In a pull request, GITHUB_SHA is the merge commit and GITHUB_HEAD_REF the
    // head branch. The pull request number and head commit come from the
    // event payload (see github-event.ts).
    read: (env) => ({
      commitSha: envValue(env, "GITHUB_SHA"),
      branch: envValue(env, "GITHUB_HEAD_REF") ?? envValue(env, "GITHUB_REF_NAME"),
      baseBranch: envValue(env, "GITHUB_BASE_REF"),
      runId: envValue(env, "GITHUB_RUN_ID"),
      runAttempt: envPositiveInt(env, "GITHUB_RUN_ATTEMPT"),
    }),
  },
  {
    name: "gitlab",
    detectedBy: "GITLAB_CI",
    read: (env) => ({
      commitSha: envValue(env, "CI_COMMIT_SHA"),
      branch: envValue(env, "CI_COMMIT_REF_NAME"),
      baseBranch: envValue(env, "CI_MERGE_REQUEST_TARGET_BRANCH_NAME"),
      runId: envValue(env, "CI_PIPELINE_ID"),
      jobId: envValue(env, "CI_JOB_ID"),
      prNumber: envPositiveInt(env, "CI_MERGE_REQUEST_IID"),
    }),
  },
  {
    name: "jenkins",
    detectedBy: "JENKINS_URL",
    // In a multibranch pull request, GIT_BRANCH is the job name (`PR-12`) and
    // CHANGE_BRANCH the head branch.
    read: (env) => ({
      commitSha: envValue(env, "GIT_COMMIT"),
      branch: envValue(env, "CHANGE_BRANCH") ?? envValue(env, "GIT_BRANCH"),
      baseBranch: envValue(env, "CHANGE_TARGET"),
      runId: envValue(env, "BUILD_TAG"),
      prNumber: envPositiveInt(env, "CHANGE_ID"),
    }),
  },
  {
    name: "circleci",
    detectedBy: "CIRCLECI",
    read: (env) => ({
      commitSha: envValue(env, "CIRCLE_SHA1"),
      branch: envValue(env, "CIRCLE_BRANCH"),
      runId: envValue(env, "CIRCLE_WORKFLOW_ID"),
      prNumber: pullRequestNumberFromUrl(envValue(env, "CIRCLE_PULL_REQUEST")),
    }),
  },
  {
    name: "azure",
    detectedBy: "BUILD_BUILDURI",
    // In a pull request, BUILD_SOURCEBRANCHNAME is `merge` (from
    // `refs/pull/<n>/merge`), so the head branch comes from the pull request.
    read: (env) => ({
      commitSha: envValue(env, "BUILD_SOURCEVERSION"),
      branch:
        withoutHeadsPrefix(envValue(env, "SYSTEM_PULLREQUEST_SOURCEBRANCH")) ??
        envValue(env, "BUILD_SOURCEBRANCHNAME"),
      baseBranch: withoutHeadsPrefix(envValue(env, "SYSTEM_PULLREQUEST_TARGETBRANCH")),
      runId: envValue(env, "BUILD_BUILDID"),
      prNumber: envPositiveInt(env, "SYSTEM_PULLREQUEST_PULLREQUESTID"),
    }),
  },
];

/**
 * Detects the CI providers Atium has rules for: GitHub Actions, GitLab CI,
 * Jenkins, CircleCI and Azure Pipelines.
 *
 * @param env - Environment variables, normally `process.env`.
 * @returns What the provider tells about the run, or `undefined` if none of
 * them is running.
 */
export function detectKnownProvider(env: EnvVars): CiDetection | undefined {
  const provider = KNOWN_PROVIDERS.find((known) => envValue(env, known.detectedBy) !== undefined);
  return provider === undefined
    ? undefined
    : { ...unknownCiDetection(provider.name), ...provider.read(env) };
}

/** Number at the end of a pull request URL, such as `https://github.com/o/r/pull/12`. */
function pullRequestNumberFromUrl(url: string | undefined): number | undefined {
  return toPositiveInt(url?.replace(/\/$/, "").split("/").at(-1));
}

function withoutHeadsPrefix(ref: string | undefined): string | undefined {
  return ref?.replace(/^refs\/heads\//, "");
}
