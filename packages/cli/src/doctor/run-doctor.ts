import { createGitClient, quoteForMessage } from "@atium/core";
import type { GitClient } from "@atium/core";
import type { CommandContext } from "../command-context.js";
import { createCliRedactor } from "../command-context.js";
import { DOCTOR_FORMATS } from "../defaults.js";
import { DOCTOR } from "../messages.js";
import { terminalText } from "../terminal-text.js";
import { UsageError } from "../usage-error.js";
import { checkCi } from "./checks/ci.js";
import { checkConfig } from "./checks/config.js";
import { checkFrameworks } from "./checks/frameworks.js";
import { checkGit } from "./checks/git.js";
import { checkNode } from "./checks/node.js";
import { checkStorage } from "./checks/storage.js";
import { formatText } from "./format-text.js";
import { DoctorReportSchema } from "./report.js";
import type { DoctorReport } from "./report.js";

/** What `atium doctor` checks besides the working directory and the environment. */
export interface DoctorOptions {
  /** Version of Node.js running, as in `process.versions.node`. */
  readonly nodeVersion: string;
  /** Git of the working directory. Defaults to `createGitClient` on it. */
  readonly git?: GitClient;
}

/** One of {@link DOCTOR_FORMATS}. */
type DoctorFormat = (typeof DOCTOR_FORMATS)[number];

/**
 * `atium doctor`: checks that Atium can run in the working directory and
 * writes the result to stdout, as a table or, with `--format json`, as a
 * {@link DoctorReport} (18-cli-config.md §26.1).
 *
 * @param context - Working directory, environment, streams, logger and global options.
 * @param options - Node.js version and, optionally, the Git client.
 * @throws {@link UsageError} for an unsupported `--format`, before checking
 * anything, and after writing the report if any check failed, so the CLI
 * exits with code 2 (18-cli-config.md §26.2).
 * @throws Any unexpected error of a check; the CLI reports it as internal.
 */
export async function runDoctor(context: CommandContext, options: DoctorOptions): Promise<void> {
  const format = doctorFormat(context.globals.format);
  const report = await diagnose(context, options);
  context.stdout.write(
    format === "json" ? `${JSON.stringify(report, null, 2)}\n` : terminalText(formatText(report)),
  );
  const failed = report.checks.filter(({ status }) => status === "fail").length;
  if (failed > 0) {
    throw new UsageError(DOCTOR.failed(failed), DOCTOR.failedHint);
  }
}

/**
 * Runs every check of `atium doctor`. Every string of the report, `details`
 * included, is redacted with the default patterns, since they can carry
 * config values or variables, and the result is validated against
 * {@link DoctorReportSchema}, the shape of `--format json`.
 *
 * @param context - Working directory, environment, logger and global options.
 * @param options - Node.js version and, optionally, the Git client.
 * @returns The report, with the checks in the order of `CHECK_IDS`.
 * @throws Any unexpected error of a check.
 */
export async function diagnose(
  context: CommandContext,
  options: DoctorOptions,
): Promise<DoctorReport> {
  const { cwd, env, logger } = context;
  const git = options.git ?? createGitClient({ cwd });
  const [config, ci, storage, frameworks] = await Promise.all([
    checkConfig(context),
    checkCi({ env, cwd, git, logger }),
    checkStorage(cwd),
    checkFrameworks(cwd, logger),
  ]);
  const gitCheck = await checkGit({ git, needed: ci.needsGit, logger });
  const checks = [checkNode(options.nodeVersion), config, gitCheck, ci.check, storage, frameworks];
  const report = { ok: checks.every(({ status }) => status !== "fail"), checks };
  return DoctorReportSchema.parse(createCliRedactor().redactFields(report));
}

function doctorFormat(format: string | undefined): DoctorFormat {
  if (format === undefined) {
    return DOCTOR_FORMATS[0];
  }
  const known = DOCTOR_FORMATS.find((value) => value === format);
  if (known === undefined) {
    throw new UsageError(DOCTOR.unsupportedFormat(quoteForMessage(format)), DOCTOR.formatHint);
  }
  return known;
}
