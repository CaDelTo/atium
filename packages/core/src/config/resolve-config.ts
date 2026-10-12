import { DEFAULT_LOG_LEVEL } from "../defaults.js";
import type { EnvVars } from "../env.js";
import { envValue } from "../env.js";
import { AtiumError } from "../errors.js";
import type { LogLevel } from "../logger.js";
import { LOG_LEVELS } from "../logger.js";
import { quoteList } from "../quote.js";
import type { ExplicitConfigFile } from "./config-file.js";
import { configInvalidError } from "./issues.js";
import { createReceivedQuoter } from "./quote-received.js";
import type { AtiumConfig } from "./schema.js";
import { AtiumConfigSchema } from "./schema.js";
import { didYouMean, suggestKey } from "./suggest.js";

/** Environment variables read by the config, normally `process.env`. Same as {@link EnvVars}. */
export type ConfigEnv = EnvVars;

/**
 * Values given as CLI flags, which take precedence over everything else.
 * The CLI maps its own flags to these, such as `--verbose` to
 * `logLevel: "debug"`.
 */
export interface ConfigFlags {
  /** Path of the config file, from `--config`. */
  readonly config?: string;
  /** Lowest severity logged. */
  readonly logLevel?: LogLevel;
}

/** A loaded config file. */
export interface ConfigFileContent {
  /** The file as shown to the user, already quoted. */
  readonly source: string;
  /** What the file exports, not validated yet. */
  readonly value: unknown;
}

/** The config, once every source has been applied. */
export interface ResolvedConfig {
  /** The config file, validated, with defaults for whatever it omits. */
  readonly config: AtiumConfig;
  /** Lowest severity logged: flag, else `ATIUM_LOG_LEVEL`, else `info`. */
  readonly logLevel: LogLevel;
}

/**
 * The config file named by the user: `--config` wins over `ATIUM_CONFIG`.
 * An empty variable counts as unset; an empty flag does not, so it fails
 * later as an unsupported file.
 *
 * @param flags - Values given as CLI flags.
 * @param env - Environment to read `ATIUM_CONFIG` from.
 * @returns The file and where it was named, or `undefined` if neither names
 * one and the file must be searched for.
 */
export function explicitConfigFile(
  flags: ConfigFlags,
  env: ConfigEnv,
): ExplicitConfigFile | undefined {
  if (flags.config !== undefined) {
    return { path: flags.config, origin: "--config" };
  }
  const fromEnv = envValue(env, "ATIUM_CONFIG");
  return fromEnv === undefined ? undefined : { path: fromEnv, origin: "ATIUM_CONFIG" };
}

/**
 * Applies the precedence of 18-cli-config.md §26.3, flags > `ATIUM_*`
 * variables > config file > defaults, and validates the result. Pure: the
 * file, if any, is already loaded.
 *
 * @param file - The loaded config file, or `undefined` if there is none, in
 * which case every section takes its defaults.
 * @param env - Environment to read `ATIUM_LOG_LEVEL` from.
 * @param flags - Values given as CLI flags. With `logLevel` set,
 * `ATIUM_LOG_LEVEL` is not read, so an invalid value there is ignored.
 * @returns The validated config and the log level.
 * @throws {@link AtiumError} `CONFIG_INVALID` if the file does not match the
 * schema or `ATIUM_LOG_LEVEL` is not a log level.
 */
export function resolveConfig(
  file: ConfigFileContent | undefined,
  env: ConfigEnv,
  flags: ConfigFlags,
): ResolvedConfig {
  const logLevel = flags.logLevel ?? logLevelFromEnv(env) ?? DEFAULT_LOG_LEVEL;
  if (file === undefined) {
    return { config: AtiumConfigSchema.parse({}), logLevel };
  }
  const parsed = AtiumConfigSchema.safeParse(file.value, { reportInput: true });
  if (!parsed.success) {
    throw configInvalidError(file.source, AtiumConfigSchema, parsed.error.issues);
  }
  return { config: parsed.data, logLevel };
}

function logLevelFromEnv(env: ConfigEnv): LogLevel | undefined {
  const value = envValue(env, "ATIUM_LOG_LEVEL");
  if (value === undefined) {
    return undefined;
  }
  const level = LOG_LEVELS.find((candidate) => candidate === value);
  if (level !== undefined) {
    return level;
  }
  const suggestion = suggestKey(value, LOG_LEVELS);
  const valid = quoteList(LOG_LEVELS);
  const quote = createReceivedQuoter();
  throw new AtiumError(
    "CONFIG_INVALID",
    `ATIUM_LOG_LEVEL must be one of ${valid} (received ${quote(value)}).`,
    {
      hint:
        suggestion === undefined
          ? `Set ATIUM_LOG_LEVEL to one of ${valid}, or unset it.`
          : didYouMean(suggestion),
    },
  );
}
