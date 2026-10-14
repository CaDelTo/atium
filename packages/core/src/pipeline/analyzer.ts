import type { z } from "zod";
import type { Finding } from "../findings/finding.js";
import type { Logger } from "../logger.js";
import type { StorageReader } from "../storage/storage.js";

/**
 * Data sources an analyzer can require (14-architecture.md §22.2). The
 * orchestrator skips, with the reason, every analyzer that requires one that
 * is not available.
 */
export const CAPABILITIES = [
  "history",
  "network",
  "dom",
  "traces",
  "coverage",
  "git",
  "openapi",
] as const;

/** Data source an analyzer can require. See {@link CAPABILITIES}. */
export type Capability = (typeof CAPABILITIES)[number];

/**
 * What an analyzer reads: source code (`static`), the current run
 * (`runtime`) or the stored history (`history`).
 */
export const ANALYZER_KINDS = ["static", "runtime", "history"] as const;

/** What an analyzer reads. See {@link ANALYZER_KINDS}. */
export type AnalyzerKind = (typeof ANALYZER_KINDS)[number];

/**
 * Project being analyzed, resolved by the CLI before running the analyzers.
 *
 * Detected frameworks and CODEOWNERS (14-architecture.md §22.2) are added by
 * the tasks that resolve them.
 */
export interface ResolvedProject {
  /** Absolute path of the repository root. `Finding.location.file` is relative to it. */
  readonly root: string;
}

/** Everything an analyzer receives in {@link Analyzer.analyze}. */
export interface AnalysisContext<C = unknown> {
  /** The analyzer's section of `analyzers` in the config, parsed with its `configSchema`. */
  readonly config: C;
  /** Project being analyzed. */
  readonly project: ResolvedProject;
  /**
   * Stored history. Present only when the `history` capability is available
   * (ADR-0023); an analyzer that needs it declares `"history"` in `requires`.
   */
  readonly storage?: StorageReader;
  /** Receives the analyzer's warnings and debug output. */
  readonly logger: Logger;
  /**
   * Aborted on timeout, with an `ANALYZER_TIMEOUT` `AtiumError` as
   * reason, or when the whole analysis is cancelled. Pass it to long
   * operations and stop when it aborts: the orchestrator ignores what the
   * analyzer returns after that.
   */
  readonly signal: AbortSignal;
}

/**
 * Turns a project, its history or its current run into {@link Finding}s
 * (14-architecture.md §22.2). Built-in analyzers and plugins implement it.
 *
 * @example
 * ```ts
 * const analyzer: Analyzer<{ maxRetries: number }> = {
 *   id: "retries",
 *   version: "1",
 *   kind: "history",
 *   requires: ["history"],
 *   configSchema: z.object({ maxRetries: z.int().default(2) }),
 *   async analyze({ config, storage, signal }) {
 *     // ...
 *     return findings;
 *   },
 * };
 * ```
 */
export interface Analyzer<C = unknown> {
  /** Unique name, such as `"flaky"`; also the key of its config section. */
  readonly id: string;
  /** Changes whenever the output for the same input can change; invalidates caches. */
  readonly version: string;
  /** What the analyzer reads. */
  readonly kind: AnalyzerKind;
  /** Capabilities that must be available for the analyzer to run. */
  readonly requires: readonly Capability[];
  /**
   * Validates the analyzer's config section and fills its defaults. It
   * receives `{}` when the section is absent.
   */
  readonly configSchema: z.ZodType<C>;
  /**
   * Produces the findings. The orchestrator validates each one with
   * `FindingSchema`, discards the invalid ones with a warning and sorts the
   * rest, so the order returned does not matter.
   *
   * @param context - Config, project, data sources, logger and signal.
   * @returns The findings, in any order.
   */
  // Method syntax on purpose: its parameter is bivariant, so an `Analyzer<C>`
  // fits in `readonly Analyzer[]`. Sound, because `configSchema` produces the `C`.
  analyze(context: AnalysisContext<C>): Promise<readonly Finding[]>;
}
