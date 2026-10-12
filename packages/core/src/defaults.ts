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
