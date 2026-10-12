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
 * Maximum size of a path quoted in an error message, in UTF-8 bytes of the
 * value once escaped for JSON. Paths come from reports, fixtures and storage,
 * so the message neither grows without bound nor carries control characters.
 *
 * Source: 06-security.md, "Rutas de archivos".
 */
export const ERROR_PATH_PREVIEW_BYTES = 200;

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
 * Source: 20-security-privacy.md §28.1 and 18-cli-config.md.
 */
export const REDACT_DEFAULTS = {
  /** Header names, compared case-insensitively. */
  headers: ["authorization", "cookie", "set-cookie", "x-api-key"],
  /** Body field names, compared case-insensitively at any depth. */
  bodyFields: ["password", "token", "cardNumber"],
  /** Every built-in pattern (`REDACT_PATTERN_IDS`). */
  patterns: ["jwt", "bearer", "aws-key", "gcp-key", "azure-key"],
} as const;
