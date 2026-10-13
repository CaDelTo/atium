import * as path from "node:path";
import { assertNever, CONFIG_FILE_NAMES, quoteForMessage } from "@atium/core";
import type { CommandContext } from "../command-context.js";
import { INIT_CONFIG_FILE, MANIFEST_MAX_BYTES } from "../defaults.js";
import { ERRORS, INIT } from "../messages.js";
import { UsageError } from "../usage-error.js";
import { configTemplate } from "./config-template.js";
import { detectFrameworks } from "./detect-frameworks.js";
import type { DetectedProject } from "./detect-frameworks.js";
import type { CappedRead } from "./project-files.js";
import {
  createFile,
  entryKind,
  errnoCode,
  isRegularFile,
  readCapped,
  replaceFile,
} from "./project-files.js";

/** Options of `atium init`. */
export interface InitOptions {
  /** `--force`: replace an existing `atium.config.ts`. */
  readonly force: boolean;
}

const MANIFEST_FILE = "package.json";

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
  const text = await readManifest(context);
  if (text === undefined) {
    return NOTHING_DETECTED;
  }
  let manifest: unknown;
  try {
    manifest = JSON.parse(text);
  } catch (error) {
    warnUnreadable(context, error);
    return NOTHING_DETECTED;
  }
  const detected = detectFrameworks(manifest);
  if (detected === undefined) {
    context.logger.warn(INIT.unreadableManifest(quoteForMessage(MANIFEST_FILE)));
    return NOTHING_DETECTED;
  }
  if (!detected.hasConfigPackage) {
    context.logger.warn(INIT.missingCore);
  }
  return detected;
}

/** The text of `package.json`, or `undefined`, with a warning, if it was not read. */
async function readManifest(context: CommandContext): Promise<string | undefined> {
  const file = quoteForMessage(MANIFEST_FILE);
  let read: CappedRead;
  try {
    read = await readCapped(path.join(context.cwd, MANIFEST_FILE), MANIFEST_MAX_BYTES);
  } catch (error) {
    warnUnreadable(context, error);
    return undefined;
  }
  switch (read.kind) {
    case "text":
      return read.text;
    case "missing":
      context.logger.warn(INIT.noManifest(file));
      return undefined;
    case "not-a-file":
      context.logger.warn(INIT.manifestNotAFile(file));
      return undefined;
    case "too-large":
      context.logger.warn(INIT.manifestTooLarge(file, MANIFEST_MAX_BYTES));
      return undefined;
    default:
      return assertNever(read);
  }
}

/**
 * The warning names only the error code: the message of a read or parse error
 * carries the absolute path or a piece of the file. `--verbose` shows it all.
 */
function warnUnreadable(context: CommandContext, error: unknown): void {
  const code = errnoCode(error);
  context.logger.warn(
    INIT.unreadableManifest(quoteForMessage(MANIFEST_FILE)),
    code === undefined ? undefined : { code },
  );
  context.logger.debug(ERRORS.details, { error });
}

function existsError(): UsageError {
  return new UsageError(INIT.exists(quoteForMessage(INIT_CONFIG_FILE)), INIT.existsHint);
}
