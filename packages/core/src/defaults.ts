import type { FindingSeverity } from "./findings/finding.js";
import type { LogLevel } from "./logger.js";

/**
 * Maximum number of items in each capped list of the data model.
 *
 * Source: ADR-0018, "Topes de listas". The writer applies them before
 * validating; the model schemas reject anything above them.
 */
export const MODEL_LIST_CAPS = {
  /** `TestResult.attempts`: the first and the last 19. */
  attempts: 20,
  /** `TestCase.tags`: the first 50. */
  tags: 50,
  /** `TestCase.titlePath`: the first level and the last 19. */
  titlePathLevels: 20,
  /** `Run.frameworkConfig.projects`: the first 100. */
  frameworkProjects: 100,
  /** `NetworkSummary.calls` per attempt. */
  networkCalls: 200,
  /** `NetworkSummary.endpoints` per attempt. */
  networkEndpoints: 200,
  /** `Attempt.pageErrors` per attempt: the last 20. */
  pageErrors: 20,
  /** `Attempt.console.samples` per attempt (05-performance.md). */
  consoleSamples: 5,
  /** `BddContext.steps` per result. */
  bddSteps: 200,
} as const;

/**
 * Maximum size of each text field of the data model, in UTF-8 bytes of the
 * value once escaped for JSON, without the surrounding quotes.
 *
 * Source: ADR-0018, "Topes de textos", and 02-data-model.md §9.2 for `message`
 * and `stack`.
 */
export const MODEL_TEXT_CAPS_BYTES = {
  /** `ErrorOccurrence.message`. */
  errorMessage: 2048,
  /** `ErrorOccurrence.stack`. */
  errorStack: 8192,
  /** Each `Attempt.pageErrors[i]`. */
  pageError: 2048,
  /** Each `Attempt.console.samples[i]`. */
  consoleSample: 1024,
  /** `ErrorOccurrence.matcher.expected` and `matcher.actual`, each. */
  matcherValue: 2048,
  /** `text` of each BDD step. */
  bddStepText: 512,
  /** `definition` of each BDD step. */
  bddStepDefinition: 256,
  /** Each name in `Run.frameworkConfig.projects`. */
  frameworkProject: 256,
  /** Any other string of the model, including record keys. */
  default: 2048,
} as const;

/**
 * Maximum size of a path or a value quoted in an error message, in UTF-8 bytes
 * of the value once escaped for JSON. Paths come from reports, fixtures and
 * storage, and values from the config file, so the message neither grows
 * without bound nor carries control characters.
 *
 * Source: engineering/06-security.md, "Rutas de archivos", and
 * 18-cli-config.md §26.3.
 */
export const ERROR_PATH_PREVIEW_BYTES = 200;

/**
 * Weight of a finding in the score of its category, by severity.
 *
 * Source: 13-score-baseline-reports.md §21.1.
 */
export const SEVERITY_WEIGHTS = {
  info: 0.25,
  warning: 1,
  error: 3,
} as const satisfies Record<FindingSeverity, number>;

/**
 * Text that replaces every redacted value.
 *
 * Source: 20-security-privacy.md §28.1.
 */
export const REDACTED_MARKER = "[REDACTED]";

/**
 * Redaction applied when the config omits the `redact` section or one of its
 * lists. A list given in the config replaces its default; it does not extend
 * it.
 *
 * `headers` and `bodyFields` hold name fragments: a name is sensitive when,
 * lowercased and without separators, it contains any of them, so `token`
 * covers `accessToken`, `refresh_token` and `X-Auth-Token`.
 *
 * Source: 20-security-privacy.md §28.1 and 18-cli-config.md §26.3.
 */
export const REDACT_DEFAULTS = Object.freeze({
  /** `authorization` also covers `proxy-authorization`; `cookie`, `set-cookie`. */
  headers: Object.freeze([
    "authorization",
    "cookie",
    "apikey",
    "token",
    "secret",
    "session",
  ] as const),
  bodyFields: Object.freeze([
    "password",
    "passwd",
    "secret",
    "token",
    "apikey",
    "credential",
    "privatekey",
    "sessionid",
    "cardnumber",
    "cvv",
  ] as const),
  /** Every built-in pattern (`REDACT_PATTERN_IDS`). */
  patterns: Object.freeze(["jwt", "bearer", "aws-key", "gcp-key", "azure-key"] as const),
});

/**
 * Config file names searched in the root when neither `--config` nor
 * `ATIUM_CONFIG` names one, in this order. Finding more than one is an error.
 *
 * Source: 18-cli-config.md §26.3.
 */
export const CONFIG_FILE_NAMES = Object.freeze([
  "atium.config.ts",
  "atium.config.mts",
  "atium.config.js",
  "atium.config.mjs",
  "atium.config.json",
] as const);

/**
 * Largest Levenshtein distance, compared in lowercase, between an unknown
 * config key and the known key suggested for it. `storgae` is at 2 from
 * `storage`.
 *
 * Source: 18-cli-config.md §26.3.
 */
export const CONFIG_SUGGESTION_MAX_DISTANCE = 2;

/**
 * Lowest severity logged when neither a flag nor `ATIUM_LOG_LEVEL` sets one:
 * `error`, `warn` and `info` are written; `debug` is not.
 *
 * Source: 18-cli-config.md §26.3, "Precedencia en V0", and
 * engineering/03-errors-logging.md, "Logging".
 */
export const DEFAULT_LOG_LEVEL = "info" satisfies LogLevel;

/**
 * The `quarantine` section when the config omits it or its `mode`.
 *
 * Source: 07-flaky.md, "Modos".
 */
export const QUARANTINE_DEFAULTS = Object.freeze({ mode: "run-and-ignore" } as const);

/**
 * The `llm` section when the config omits it or its `enabled`: the LLM is
 * opt-in.
 *
 * Source: 00-overview.md, principle 8, and 20-security-privacy.md §28, row
 * "LLM".
 */
export const LLM_DEFAULTS = Object.freeze({ enabled: false } as const);

/**
 * Largest GitHub Actions event payload read, in bytes: 10 MiB. The payload
 * holds text written by pull request authors and pushes with many commits,
 * so it is measured before it is parsed; a larger one is skipped with a
 * warning and the run is saved without the pull request number and head
 * commit.
 *
 * Source: 02-data-model.md §10.1 and engineering/06-security.md, "Entradas".
 */
export const GITHUB_EVENT_MAX_BYTES = 10 * 1024 * 1024;
