import { z } from "zod";
import type { Logger } from "../logger.js";
import type envCiFunction from "env-ci";
import type { EnvVars } from "../env.js";
import { nonEmpty } from "../env.js";
import { toPositiveInt } from "./env.js";
import type { CiDetection } from "./providers.js";
import { unknownCiDetection } from "./providers.js";

/** The part of env-ci's result Atium reads. Every field is a string or missing. */
const EnvCiResultSchema = z.looseObject({
  service: z.string().optional(),
  commit: z.string().optional(),
  branch: z.string().optional(),
  prBranch: z.string().optional(),
  isPr: z.boolean().optional(),
  pr: z.union([z.string(), z.number()]).optional(),
  build: z.union([z.string(), z.number()]).optional(),
  job: z.union([z.string(), z.number()]).optional(),
});

/** Options of {@link detectWithEnvCi}. */
export interface DetectWithEnvCiOptions {
  /** Environment variables, normally `process.env`. */
  readonly env: EnvVars;
  /** Working directory, where env-ci may run `git`. */
  readonly cwd: string;
  /** Receives a warning when env-ci fails. */
  readonly logger: Logger;
  /** env-ci itself; replaced only in tests. Defaults to importing it on demand. */
  readonly envCi?: EnvCi;
}

/** Signature of env-ci's default export. */
type EnvCi = typeof envCiFunction;

async function importEnvCi(): Promise<EnvCi> {
  const { default: envCi } = await import("env-ci");
  return envCi;
}

/**
 * Detects a CI provider Atium has no rules for (Travis CI, Buildkite,
 * Bitbucket Pipelines…) with env-ci, imported on demand.
 *
 * @param options - Environment, working directory and logger.
 * @returns What the provider tells about the run, or `undefined` if env-ci
 * does not recognize it or fails, which is logged as a warning.
 */
export async function detectWithEnvCi(
  options: DetectWithEnvCiOptions,
): Promise<CiDetection | undefined> {
  let result: unknown;
  try {
    const envCi = options.envCi ?? (await importEnvCi());
    result = envCi({ env: options.env, cwd: options.cwd });
  } catch (error) {
    options.logger.warn("Could not detect the CI provider; the run is saved as local", { error });
    return undefined;
  }
  const parsed = EnvCiResultSchema.safeParse(result);
  if (!parsed.success) {
    options.logger.warn("env-ci returned an unexpected result; the run is saved as local", {
      issues: parsed.error.issues,
    });
    return undefined;
  }
  // Without a service, env-ci only ran Git, which Atium does on its own.
  if (parsed.data.service === undefined) {
    return undefined;
  }
  const { service, commit, branch, prBranch, isPr, pr, build, job } = parsed.data;
  // In a pull request, env-ci's `branch` is the target and `prBranch` the head.
  return {
    ...unknownCiDetection(service),
    commitSha: nonEmpty(commit),
    branch: nonEmpty(isPr === true ? prBranch : branch),
    baseBranch: isPr === true ? nonEmpty(branch) : undefined,
    runId: nonEmpty(asText(build)),
    jobId: nonEmpty(asText(job)),
    prNumber: toPositiveInt(asText(pr)),
  };
}

function asText(value: string | number | undefined): string | undefined {
  return value === undefined ? undefined : String(value);
}
