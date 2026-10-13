import * as path from "node:path";
import { loadConfig, quoteForMessage } from "@atium/core";
import type { LoadedConfig } from "@atium/core";
import type { CommandContext } from "../../command-context.js";
import { isUserError } from "../../error-kind.js";
import { DOCTOR } from "../../messages.js";
import type { DoctorCheckOf } from "../report.js";
import { errorOutcome } from "./error-outcome.js";

/**
 * The `config` check: the config is found and valid, as every other command
 * would load it, with `--config` and `ATIUM_CONFIG` (18-cli-config.md §26.3).
 *
 * @param context - Working directory, environment, logger and global options.
 * @returns `pass` with the file loaded, `warn` without a config file, or
 * `fail` with the error of `loadConfig` and its hint.
 * @throws Any error of `loadConfig` that is not a configuration error.
 */
export async function checkConfig(context: CommandContext): Promise<DoctorCheckOf<"config">> {
  const { config, logLevel } = context.globals;
  let loaded: LoadedConfig;
  try {
    loaded = await loadConfig({
      cwd: context.cwd,
      env: context.env,
      flags: {
        ...(config === undefined ? {} : { config }),
        ...(logLevel === undefined ? {} : { logLevel }),
      },
    });
  } catch (error) {
    if (!isUserError(error)) {
      throw error;
    }
    return {
      id: "config",
      status: "fail",
      ...errorOutcome(error, DOCTOR.config.invalidHint, context.logger),
      details: { file: null, adapters: null },
    };
  }
  if (loaded.configPath === undefined) {
    return {
      id: "config",
      status: "warn",
      message: DOCTOR.config.none,
      hint: DOCTOR.config.noneHint,
      details: { file: null, adapters: null },
    };
  }
  const file = displayPath(context.cwd, loaded.configPath);
  const adapters = [...(loaded.config.adapters ?? [])];
  return {
    id: "config",
    status: "pass",
    message: DOCTOR.config.loaded(quoteForMessage(file), adapters),
    details: { file, adapters },
  };
}

/** `file` relative to `cwd` if it is inside it, or else as it is, as `loadConfig` shows it. */
function displayPath(cwd: string, file: string): string {
  const relative = path.relative(cwd, file);
  const outside =
    relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative);
  return outside ? file : relative;
}
