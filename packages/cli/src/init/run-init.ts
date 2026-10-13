import * as path from "node:path";
import { CONFIG_FILE_NAMES, quoteForMessage } from "@atium/core";
import type { CommandContext } from "../command-context.js";
import { INIT_CONFIG_FILE } from "../defaults.js";
import { ERRORS, INIT } from "../messages.js";
import type { DetectedProject } from "../project/detect-frameworks.js";
import { manifestProblem, readProjectManifest } from "../project/manifest.js";
import { createFile, entryKind, isRegularFile, replaceFile } from "../project/project-files.js";
import { UsageError } from "../usage-error.js";
import { configTemplate } from "./config-template.js";

/** Options of `atium init`. */
export interface InitOptions {
  /** `--force`: replace an existing `atium.config.ts`. */
  readonly force: boolean;
}

/** Detected when there is no usable `package.json`. */
const NOTHING_DETECTED: DetectedProject = Object.freeze({
  adapters: Object.freeze([]),
  hasConfigPackage: false,
});

/**
 * `atium init`: creates `atium.config.ts` in the working directory with the
 * adapters of the frameworks found in `package.json` (18-cli-config.md §26.1).
 *
 * - An existing `atium.config.ts` is replaced, atomically, only with
 *   `--force`. Any other `atium.config.*` that `loadConfig` would find stops
 *   it, even with `--force`, since two config files make the search fail.
 * - A missing, unreadable or oversized `package.json` is not an error: it is
 *   logged and the config gets no adapters.
 *
 * @param context - Working directory, streams, logger and global options.
 * @param options - `--force`.
 * @throws {@link UsageError} with `--config`, or if a config file or a
 * directory is in the way.
 * @throws The file system error if the working directory cannot be checked or
 * written; the CLI reports it as internal.
 */
export async function runInit(context: CommandContext, options: InitOptions): Promise<void> {
  if (context.globals.config !== undefined) {
    throw new UsageError(INIT.configFlag, INIT.configFlagHint);
  }
  const target = path.join(context.cwd, INIT_CONFIG_FILE);
  await checkExistingConfig(context.cwd, target, options.force);
  warnAboutConfigVariable(context);
  const detected = await detectProject(context);
  const content = configTemplate(detected.adapters);
  if (options.force) {
    await replaceFile(target, content);
  } else if ((await createFile(target, content)) === "exists") {
    // Created by someone else after the checks.
    throw existsError();
  }
  context.stdout.write(`${INIT.created(detected.adapters)}\n`);
}

async function checkExistingConfig(cwd: string, target: string, force: boolean): Promise<void> {
  const kind = await entryKind(target);
  if (kind === "directory") {
    throw new UsageError(INIT.directory(quoteForMessage(INIT_CONFIG_FILE)), INIT.directoryHint);
  }
  const others = CONFIG_FILE_NAMES.filter((name) => name !== INIT_CONFIG_FILE);
  const found = await Promise.all(others.map((name) => isRegularFile(path.join(cwd, name))));
  const existing = others.filter((_, index) => found[index] === true);
  if (existing.length > 0) {
    const list = existing.map((name) => quoteForMessage(name)).join(", ");
    throw new UsageError(INIT.otherConfig(list), INIT.otherConfigHint);
  }
  if (kind === "file" && !force) {
    throw existsError();
  }
}

/** `init` writes to the working directory whatever `ATIUM_CONFIG` says, so it warns. */
function warnAboutConfigVariable(context: CommandContext): void {
  const value = context.env["ATIUM_CONFIG"];
  if (value !== undefined && value !== "") {
    context.logger.warn(INIT.configVariable(quoteForMessage(value)));
  }
}

async function detectProject(context: CommandContext): Promise<DetectedProject> {
  const read = await readProjectManifest(context.cwd);
  if (read.kind === "detected") {
    if (!read.project.hasConfigPackage) {
      context.logger.warn(INIT.missingCore);
    }
    return read.project;
  }
  // The warning names only the error code; `--verbose` shows the error itself.
  const { message, code, error } = manifestProblem(read);
  context.logger.warn(message, code === undefined ? undefined : { code });
  if (error !== undefined) {
    context.logger.debug(ERRORS.details, { error });
  }
  return NOTHING_DETECTED;
}

function existsError(): UsageError {
  return new UsageError(INIT.exists(quoteForMessage(INIT_CONFIG_FILE)), INIT.existsHint);
}
