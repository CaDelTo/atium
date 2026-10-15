import { stat } from "node:fs/promises";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import { CONFIG_FILE_NAMES } from "../defaults.js";
import { AtiumError } from "../errors.js";
import { quoteForMessage } from "../quote.js";
import { isMissingFileError } from "../errno.js";

// The only I/O of `core`: finding and loading the config file stays here, next
// to the precedence and the validation (ADR-0017).

/** A config file named by the user instead of searched for. */
export interface ExplicitConfigFile {
  /** The path as given, absolute or relative to the working directory. */
  readonly path: string;
  /** Where it was given, to point at it in errors. */
  readonly origin: "--config" | "ATIUM_CONFIG";
}

/** Extensions of {@link CONFIG_FILE_NAMES}, the only ones a config file may have. */
const CONFIG_EXTENSIONS: readonly string[] = CONFIG_FILE_NAMES.map((name) => path.extname(name));

/**
 * Finds the config file: the one named by `explicit` if given, or else the
 * single `atium.config.{ts,mts,js,mjs,json}` in `cwd`.
 *
 * @param cwd - Working directory, absolute: the root searched and the base of
 * a relative `explicit` path.
 * @param explicit - The file named with `--config` or `ATIUM_CONFIG`, if any.
 * @returns The absolute path of the file, or `undefined` if none was named and
 * none exists in `cwd`.
 * @throws {@link AtiumError} `CONFIG_NOT_FOUND` if the named file does not
 * exist or a file cannot be checked, and `CONFIG_INVALID` if the named file
 * has an unsupported extension or `cwd` holds more than one config file.
 */
export async function findConfigFile(
  cwd: string,
  explicit: ExplicitConfigFile | undefined,
): Promise<string | undefined> {
  if (explicit !== undefined) {
    return checkExplicit(cwd, explicit);
  }
  const candidates = CONFIG_FILE_NAMES.map((name) => path.join(cwd, name));
  const exists = await Promise.all(candidates.map(isFile));
  const found = candidates.filter((_, index) => exists[index] === true);
  if (found.length > 1) {
    const names = found.map((file) => quoteForMessage(path.basename(file))).join(", ");
    throw new AtiumError(
      "CONFIG_INVALID",
      `Found ${String(found.length)} config files in ${quoteForMessage(cwd)} (${names}), so it is unclear which one to use.`,
      { hint: "Keep only one of them, or choose one with --config." },
    );
  }
  return found[0];
}

async function checkExplicit(cwd: string, explicit: ExplicitConfigFile): Promise<string> {
  const file = path.resolve(cwd, explicit.path);
  if (!CONFIG_EXTENSIONS.includes(path.extname(file))) {
    throw new AtiumError(
      "CONFIG_INVALID",
      `Config file ${quoteForMessage(explicit.path)}, given with ${explicit.origin}, has an unsupported extension, so it cannot be loaded.`,
      { hint: `Use a file ending in ${CONFIG_EXTENSIONS.join(", ")}.` },
    );
  }
  if (!(await isFile(file))) {
    throw new AtiumError(
      "CONFIG_NOT_FOUND",
      `Config file ${quoteForMessage(explicit.path)}, given with ${explicit.origin}, does not exist or is not a file.`,
      {
        hint: `Fix the path in ${explicit.origin} (relative paths start at ${quoteForMessage(cwd)}), or remove it to use the atium.config.* file of that directory.`,
      },
    );
  }
  return file;
}

/** Whether `file` exists and is a file. Errors other than "not found" are thrown. */
async function isFile(file: string): Promise<boolean> {
  try {
    return (await stat(file)).isFile();
  } catch (error) {
    if (isMissingFileError(error)) {
      return false;
    }
    throw new AtiumError(
      "CONFIG_NOT_FOUND",
      `Could not check whether config file ${quoteForMessage(file)} exists.`,
      { cause: error, hint: "Check that Atium can read that directory." },
    );
  }
}

/**
 * Loads a config file with jiti, imported only now so that commands that do
 * not read the config do not pay for it (ADR-0017, 05-performance.md).
 *
 * The file is code: it runs with the permissions of the user, as an ESLint
 * or Vite config does (20-security-privacy.md §28). Modules are evaluated
 * fresh every time and nothing is cached on disk.
 *
 * @param file - Absolute path of the config file.
 * @param source - The file as shown to the user.
 * @returns The default export of the file; for JSON, its content.
 * @throws {@link AtiumError} `CONFIG_INVALID` if the file fails to compile or
 * run, or has no default export.
 */
export async function loadConfigFile(file: string, source: string): Promise<unknown> {
  const { createJiti } = await import("jiti");
  const jiti = createJiti(pathToFileURL(file).href, { moduleCache: false, fsCache: false });
  let loaded: unknown;
  try {
    loaded = await jiti.import(file);
  } catch (error) {
    throw new AtiumError(
      "CONFIG_INVALID",
      `Could not load config file ${source}: ${quoteForMessage(firstLine(error))}.`,
      { cause: error, hint: "Fix the error in the config file and run the command again." },
    );
  }
  if (typeof loaded !== "object" || loaded === null || !("default" in loaded)) {
    throw new AtiumError("CONFIG_INVALID", `Config file ${source} has no default export.`, {
      hint: "Export the config with `export default defineConfig({ ... })`.",
    });
  }
  return loaded.default;
}

function firstLine(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error);
  return text.replace(/\n[\s\S]*/, "").trim();
}
