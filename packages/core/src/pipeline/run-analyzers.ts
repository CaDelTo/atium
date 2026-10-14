import pLimit from "p-limit";
import { assertNever } from "../assert-never.js";
import { ANALYZER_CONCURRENCY, ANALYZER_TIMEOUT_MS } from "../defaults.js";
import { AtiumError } from "../errors.js";
import { compareFindings } from "../findings/compare.js";
import { FindingSchema } from "../findings/finding.js";
import type { Finding } from "../findings/finding.js";
import type { Logger } from "../logger.js";
import { quoteForMessage } from "../quote.js";
import type { Scheduler } from "../scheduler.js";
import type { StorageReader } from "../storage/storage.js";
import { describeIssues } from "../zod-issues.js";
import type { AnalysisContext, Analyzer, Capability, ResolvedProject } from "./analyzer.js";

/** Input of {@link runAnalyzers}, shared by every analyzer of the run. */
export interface RunAnalyzersContext {
  /**
   * The `analyzers` section of the config, by analyzer id. An analyzer whose
   * section is absent gets `{}`, so its `configSchema` fills the defaults.
   */
  readonly configs?: Readonly<Record<string, unknown>>;
  /** Project being analyzed. */
  readonly project: ResolvedProject;
  /**
   * Stored history. The `history` capability is available exactly when it is
   * present (ADR-0023), so it is not listed in `capabilities`.
   */
  readonly storage?: StorageReader;
  /** Available capabilities other than `history`. */
  readonly capabilities?: Iterable<Exclude<Capability, "history">>;
  /** Receives the warnings of the orchestrator and is passed to each analyzer. */
  readonly logger: Logger;
  /** Measures the timeout of each analyzer. */
  readonly scheduler: Scheduler;
  /** Cancels the whole analysis: analyzers still running or waiting are skipped as `aborted`. */
  readonly signal?: AbortSignal;
  /**
   * Time each analyzer has, in milliseconds, from the validation of its config
   * to its findings. An integer from 1 to 2^31 - 1. Defaults to
   * {@link ANALYZER_TIMEOUT_MS}.
   */
  readonly timeoutMs?: number;
  /**
   * Analyzers started at the same time, a positive integer. Defaults to
   * {@link ANALYZER_CONCURRENCY}. A slot is freed when an analyzer times out
   * or the analysis is cancelled, even if the analyzer ignores its signal and
   * keeps working; otherwise one stuck analyzer would hold the queue.
   */
  readonly concurrency?: number;
}

/**
 * Why an analyzer did not contribute findings:
 *
 * - `missing-capabilities`: it requires capabilities that are not available.
 * - `duplicate-id`: an earlier analyzer has the same `id`.
 * - `invalid-config`: its config section does not match its `configSchema`.
 * - `timeout`: it did not finish within the timeout.
 * - `failed`: it threw, or returned something other than an array; or its
 *   `configSchema` threw instead of reporting issues.
 * - `aborted`: the analysis was cancelled; `error` is the signal's reason.
 */
export type SkipReason =
  | { readonly kind: "missing-capabilities"; readonly missing: readonly Capability[] }
  | { readonly kind: "duplicate-id" }
  | { readonly kind: "invalid-config"; readonly error: AtiumError }
  | { readonly kind: "timeout"; readonly error: AtiumError }
  | { readonly kind: "failed"; readonly error: unknown }
  | { readonly kind: "aborted"; readonly error: unknown };

/** An analyzer that did not contribute findings, and why. */
export interface SkippedAnalyzer {
  /** `id` of the analyzer. */
  readonly analyzer: string;
  /** Why it was skipped. */
  readonly reason: SkipReason;
}

/** Output of {@link runAnalyzers}. */
export interface AnalysisResult {
  /** Valid findings of every analyzer that finished, sorted with `compareFindings`. */
  readonly findings: readonly Finding[];
  /** Skipped analyzers, in the order they were given. */
  readonly skipped: readonly SkippedAnalyzer[];
}

interface Skipped {
  readonly kind: "skipped";
  readonly reason: SkipReason;
}

type Outcome = { readonly kind: "ran"; readonly values: readonly unknown[] } | Skipped;

// Longest delay a timer accepts; Node runs a longer one after 1 ms.
const MAX_TIMEOUT_MS = 2 ** 31 - 1;

/**
 * Runs analyzers and gathers their findings (14-architecture.md §22.2).
 *
 * - Skips with the reason the analyzers whose `requires` are not available,
 *   and those with a duplicate `id`.
 * - Runs the rest in parallel, at most `concurrency` at a time, each with its
 *   own timeout and `AbortSignal`. The timeout includes validating the
 *   analyzer's config section with its `configSchema`.
 * - Fail-open (ADR-0006): an analyzer that throws, times out or has an
 *   invalid config is skipped with a warning and does not affect the others.
 * - Validates each finding with `FindingSchema` and discards the invalid ones
 *   with a warning per analyzer.
 *
 * The output does not depend on the order in which analyzers finish:
 * findings are sorted with `compareFindings`, and skipped analyzers and
 * warnings follow the order of `analyzers`.
 *
 * @param analyzers - Analyzers to run, in a stable order.
 * @param context - Config sections, project, data sources and options.
 * @returns The findings and the skipped analyzers. Never rejects because an
 * analyzer throws, rejects, hangs or returns invalid data. The analyzer
 * objects themselves must match {@link Analyzer} (plugins are checked when
 * loaded, §22.4), and the logger and scheduler must keep their contract of
 * never throwing.
 * @throws RangeError if `timeoutMs` is not an integer from 1 to 2^31 - 1, or
 * `concurrency` is not a positive integer.
 *
 * @example
 * ```ts
 * const { findings, skipped } = await runAnalyzers([flaky, triage], {
 *   configs: config.analyzers,
 *   project: { root },
 *   storage,
 *   capabilities: ["git"],
 *   logger,
 *   scheduler: systemScheduler,
 * });
 * ```
 */
export async function runAnalyzers(
  analyzers: readonly Analyzer[],
  context: RunAnalyzersContext,
): Promise<AnalysisResult> {
  const timeoutMs = context.timeoutMs ?? ANALYZER_TIMEOUT_MS;
  const concurrency = context.concurrency ?? ANALYZER_CONCURRENCY;
  assertIntegerInRange("timeoutMs", timeoutMs, MAX_TIMEOUT_MS);
  assertIntegerInRange("concurrency", concurrency, Number.MAX_SAFE_INTEGER);

  const available = new Set<Capability>(context.capabilities);
  // Exactly when storage is present, even if a JavaScript caller lists "history".
  if (context.storage === undefined) {
    available.delete("history");
  } else {
    available.add("history");
  }
  const limit = pLimit(concurrency);
  const seen = new Set<string>();
  // The checks before `await` run synchronously, in the order of `analyzers`,
  // so the first analyzer with a given id is the one that runs.
  const runs = analyzers.map(async (analyzer) => {
    const { id } = analyzer;
    if (seen.has(id)) {
      return { id, outcome: skippedBecause({ kind: "duplicate-id" }) };
    }
    seen.add(id);
    const missing = [...new Set(analyzer.requires)].filter(
      (capability) => !available.has(capability),
    );
    if (missing.length > 0) {
      return { id, outcome: skippedBecause({ kind: "missing-capabilities", missing }) };
    }
    return { id, outcome: await limit(() => runOne(analyzer, context, timeoutMs)) };
  });

  const findings: Finding[] = [];
  const skipped: SkippedAnalyzer[] = [];
  for (const { id, outcome } of await Promise.all(runs)) {
    switch (outcome.kind) {
      case "ran":
        findings.push(...validFindings(id, outcome.values, context.logger));
        break;
      case "skipped":
        warnSkipped(id, outcome.reason, context.logger);
        skipped.push({ analyzer: id, reason: outcome.reason });
        break;
      default:
        assertNever(outcome);
    }
  }
  // `toSorted` is stable: equal findings keep the order of `analyzers`.
  return { findings: findings.toSorted(compareFindings), skipped };
}

// The orchestrator turns every failure into a `SkipReason` instead of using
// `failOpen`: its fixed fallback cannot say why an analyzer was skipped, and
// its warning would also be logged for a rejection that arrives after the
// timeout, when `runAnalyzers` may have already returned.
async function runOne(
  analyzer: Analyzer,
  context: RunAnalyzersContext,
  timeoutMs: number,
): Promise<Outcome> {
  const outer = context.signal;
  if (outer?.aborted === true) {
    return skippedBecause({ kind: "aborted", error: outer.reason });
  }
  const controller = new AbortController();
  const signal =
    outer === undefined ? controller.signal : AbortSignal.any([outer, controller.signal]);
  const cleanups: (() => void)[] = [];
  // The timeout and the cancellation are armed before any work starts, so
  // neither can be missed. Every contender resolves and none rejects, so
  // whatever loses the race settles later without an unhandled rejection or a
  // late warning.
  const contenders = [
    new Promise<Outcome>((resolve) => {
      cleanups.push(
        context.scheduler.setTimeout(() => {
          const error = timeoutError(analyzer.id, timeoutMs);
          controller.abort(error);
          resolve(skippedBecause({ kind: "timeout", error }));
        }, timeoutMs),
      );
    }),
  ];
  if (outer !== undefined) {
    contenders.push(abortOutcome(outer, cleanups));
  }
  contenders.push(configuredOutcome(analyzer, context, signal));
  try {
    return await Promise.race(contenders);
  } finally {
    for (const cleanup of cleanups) {
      cleanup();
    }
  }
}

// Validates the config section and, unless the run was aborted meanwhile, runs the analyzer.
async function configuredOutcome(
  analyzer: Analyzer,
  context: RunAnalyzersContext,
  signal: AbortSignal,
): Promise<Outcome> {
  const config = await parseConfig(analyzer, context.configs ?? {});
  if (config.kind === "skipped") {
    return config;
  }
  if (signal.aborted) {
    // The timeout or the cancellation already won the race; this value is ignored.
    return skippedBecause({ kind: "aborted", error: signal.reason });
  }
  return analysisOutcome(analyzer, {
    config: config.value,
    project: context.project,
    ...(context.storage === undefined ? {} : { storage: context.storage }),
    logger: context.logger,
    signal,
  });
}

// Runs the analyzer and turns what it returns, or throws, into an outcome.
function analysisOutcome(analyzer: Analyzer, context: AnalysisContext): Promise<Outcome> {
  return Promise.resolve()
    .then(() => analyzer.analyze(context))
    .then(
      (values: unknown): Outcome =>
        Array.isArray(values)
          ? { kind: "ran", values }
          : skippedBecause({ kind: "failed", error: notAnArrayError(analyzer.id, values) }),
      (error: unknown) => skippedBecause({ kind: "failed", error }),
    );
}

// Resolves when `signal` aborts. Pushes the removal of its listener to `cleanups`.
function abortOutcome(signal: AbortSignal, cleanups: (() => void)[]): Promise<Outcome> {
  return new Promise((resolve) => {
    const onAbort = (): void => {
      resolve(skippedBecause({ kind: "aborted", error: signal.reason }));
    };
    signal.addEventListener("abort", onAbort, { once: true });
    cleanups.push(() => {
      signal.removeEventListener("abort", onAbort);
    });
  });
}

async function parseConfig(
  analyzer: Analyzer,
  configs: Readonly<Record<string, unknown>>,
): Promise<{ readonly kind: "parsed"; readonly value: unknown } | Skipped> {
  // `Object.hasOwn`: an id such as "constructor" must not read the prototype.
  const section = Object.hasOwn(configs, analyzer.id) ? configs[analyzer.id] : {};
  try {
    // Async, so a schema with async refinements also works.
    const parsed = await analyzer.configSchema.safeParseAsync(section);
    if (parsed.success) {
      return { kind: "parsed", value: parsed.data };
    }
    return skippedBecause({
      kind: "invalid-config",
      error: new AtiumError(
        "CONFIG_INVALID",
        `Config section analyzers.${quoteForMessage(analyzer.id)} is invalid: ${describeIssues(parsed.error.issues)}.`,
        {
          cause: parsed.error,
          hint: "Fix the section in atium.config, or remove it to use the analyzer's defaults.",
        },
      ),
    });
  } catch (error) {
    // A third-party schema can throw instead of reporting issues.
    return skippedBecause({ kind: "failed", error });
  }
}

function validFindings(id: string, values: readonly unknown[], logger: Logger): Finding[] {
  const valid: Finding[] = [];
  let firstInvalid: string | undefined;
  let discarded = 0;
  for (const value of values) {
    const parsed = FindingSchema.safeParse(value);
    if (parsed.success) {
      valid.push(parsed.data);
    } else {
      discarded += 1;
      firstInvalid ??= describeIssues(parsed.error.issues);
    }
  }
  if (firstInvalid !== undefined) {
    logger.warn("analyzer returned invalid findings; discarding them", {
      analyzer: id,
      discarded,
      error: new AtiumError(
        "MODEL_INVALID",
        `Analyzer ${quoteForMessage(id)} returned ${String(discarded)} invalid finding(s); the first one has: ${firstInvalid}.`,
        { hint: "Report it to the analyzer's maintainers. Its valid findings are kept." },
      ),
    });
  }
  return valid;
}

function warnSkipped(id: string, reason: SkipReason, logger: Logger): void {
  switch (reason.kind) {
    case "missing-capabilities":
    case "aborted":
      // Expected: reported in `skipped`, not a problem to warn about.
      return;
    case "duplicate-id":
      logger.warn("analyzer id is already registered; skipping the duplicate", { analyzer: id });
      return;
    case "invalid-config":
      logger.warn("analyzer config is invalid; skipping the analyzer", {
        analyzer: id,
        error: reason.error,
      });
      return;
    case "timeout":
      logger.warn("analyzer timed out; skipping it", { analyzer: id, error: reason.error });
      return;
    case "failed":
      logger.warn("analyzer failed; skipping it", { analyzer: id, error: reason.error });
      return;
    default:
      assertNever(reason);
  }
}

function skippedBecause(reason: SkipReason): Skipped {
  return { kind: "skipped", reason };
}

function timeoutError(id: string, timeoutMs: number): AtiumError {
  return new AtiumError(
    "ANALYZER_TIMEOUT",
    `Analyzer ${quoteForMessage(id)} did not finish within ${String(timeoutMs)} ms.`,
    { hint: "Its findings are left out of this run. Check the analyzer for slow or stuck work." },
  );
}

function notAnArrayError(id: string, value: unknown): TypeError {
  return new TypeError(
    `Analyzer ${quoteForMessage(id)} returned ${value === null ? "null" : typeof value} instead of an array of findings.`,
  );
}

function assertIntegerInRange(name: string, value: number, max: number): void {
  if (!Number.isSafeInteger(value) || value < 1 || value > max) {
    throw new RangeError(
      `runAnalyzers expects ${name} to be an integer from 1 to ${String(max)}, received ${String(value)}.`,
    );
  }
}
