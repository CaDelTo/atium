import * as path from "node:path";
import { quoteForMessage } from "../quote.js";
import { findConfigFile, loadConfigFile } from "./config-file.js";
import type { ConfigEnv, ConfigFlags, ResolvedConfig } from "./resolve-config.js";
import { explicitConfigFile, resolveConfig } from "./resolve-config.js";

/** Options for {@link loadConfig}. */
export interface LoadConfigOptions {
  /** Working directory, absolute: where `atium.config.*` is searched. */
  readonly cwd: string;
  /** Environment to read `ATIUM_*` variables from, normally `process.env`. */
  readonly env: ConfigEnv;
  /** Values given as CLI flags. */
  readonly flags?: ConfigFlags;
}

/** The config, loaded and resolved. */
export interface LoadedConfig extends ResolvedConfig {
  /** Absolute path of the config file, or `undefined` if there is none. */
  readonly configPath: string | undefined;
}

/**
 * Finds, loads and validates the config (18-cli-config.md §26.3).
 *
 * - The file is the one named by `flags.config`, else by `ATIUM_CONFIG`, else
 *   the single `atium.config.{ts,mts,js,mjs,json}` in `cwd`. Without one,
 *   every section takes its defaults; that is not an error.
 * - Precedence: flags > `ATIUM_*` variables > config file > defaults. In V0
 *   only `ATIUM_CONFIG` and `ATIUM_LOG_LEVEL` are read.
 *
 * Errors are the user's to fix, so they are thrown rather than swallowed;
 * the CLI exits with code 2.
 *
 * @param options - Working directory, environment and flags.
 * @returns The validated config, the log level and the file used.
 * @throws {@link AtiumError} `CONFIG_NOT_FOUND` if the named file does not
 * exist, and `CONFIG_INVALID` if the file cannot be loaded or is invalid, or
 * `ATIUM_LOG_LEVEL` is not a log level.
 *
 * @example
 * ```ts
 * const { config, logLevel } = await loadConfig({
 *   cwd: process.cwd(),
 *   env: process.env,
 *   flags: { config: options.config },
 * });
 * ```
 */
export async function loadConfig(options: LoadConfigOptions): Promise<LoadedConfig> {
  const { cwd, env, flags = {} } = options;
  const configPath = await findConfigFile(cwd, explicitConfigFile(flags, env));
  if (configPath === undefined) {
    return { ...resolveConfig(undefined, env, flags), configPath };
  }
  const source = quoteForMessage(displayPath(cwd, configPath));
  const value = await loadConfigFile(configPath, source);
  return { ...resolveConfig({ source, value }, env, flags), configPath };
}

/** `file` relative to `cwd` if it is inside it, or else as it is. */
function displayPath(cwd: string, file: string): string {
  const relative = path.relative(cwd, file);
  return relative.startsWith("..") || path.isAbsolute(relative) ? file : relative;
}
