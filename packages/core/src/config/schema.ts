import { z } from "zod";
import { LLM_DEFAULTS, QUARANTINE_DEFAULTS } from "../defaults.js";
import { RedactConfigSchema } from "../redact/redactor.js";

/** How quarantined tests are handled (07-flaky.md, "Modos"). */
export const QUARANTINE_MODES = ["run-and-ignore", "skip"] as const;

/** One of {@link QUARANTINE_MODES}. */
export type QuarantineMode = (typeof QUARANTINE_MODES)[number];

const NamesSchema = z.array(z.string().min(1)).readonly();

/**
 * A section whose keys are not validated yet: the phase that implements it
 * adds its schema. Unknown keys inside it are kept.
 */
const OpenSectionSchema = z.looseObject({}).readonly();

/**
 * The config file (18-cli-config.md §26.3), validated with Zod. Unknown keys
 * at the top level and in `quarantine` and `redact` are errors.
 *
 * - `adapters` and `plugins` are lists of package names.
 * - `storage`, `network`, `gate` and each `analyzers.<name>` are open objects
 *   for now; each phase adds the schema of its section.
 * - `quarantine`, `redact` and `llm` take their defaults when omitted.
 */
export const AtiumConfigSchema = z
  .strictObject({
    /** Frameworks whose reports are read, such as `"playwright"`. */
    adapters: NamesSchema.optional(),
    /**
     * Packages or local files that add analyzers, triage rules, reporters,
     * adapters or storage backends, such as `"@atium/analyzer-gaps"` or
     * `"./tools/my-company-rules.ts"` (14-architecture.md §22.4).
     */
    plugins: NamesSchema.optional(),
    /** Where the run history is kept (15-storage.md). */
    storage: OpenSectionSchema.optional(),
    /** Hosts and endpoints of the application under test (09-network-chaos.md). */
    network: OpenSectionSchema.optional(),
    /** Settings of each analyzer, by analyzer name. */
    analyzers: z.record(z.string(), OpenSectionSchema).readonly().optional(),
    /** How quarantined tests are handled (07-flaky.md). */
    quarantine: z
      .strictObject({
        mode: z.enum(QUARANTINE_MODES).default(QUARANTINE_DEFAULTS.mode),
        auto: z.boolean().optional(),
      })
      .readonly()
      .prefault({}),
    /** When `atium gate` fails the pipeline (19-ci-cd.md). */
    gate: OpenSectionSchema.optional(),
    /** What is removed before persisting or logging (20-security-privacy.md §28.1). */
    redact: RedactConfigSchema.prefault({}),
    /**
     * Optional LLM assistance, off unless enabled (00-overview.md, principle 8);
     * its provider is described in 14-architecture.md §22.5.
     */
    llm: z
      .looseObject({ enabled: z.boolean().default(LLM_DEFAULTS.enabled) })
      .readonly()
      .prefault({}),
  })
  .readonly();

/** The config with defaults applied. See {@link AtiumConfigSchema}. */
export type AtiumConfig = z.output<typeof AtiumConfigSchema>;

/** The config as written in `atium.config.*`, before defaults. See {@link AtiumConfigSchema}. */
export type AtiumConfigInput = z.input<typeof AtiumConfigSchema>;

/**
 * Types the config file. It returns its argument unchanged; validation
 * happens when the config is loaded.
 *
 * @param config - The config, as written in `atium.config.ts`.
 * @returns The same object.
 *
 * @example
 * ```ts
 * // atium.config.ts
 * import { defineConfig } from "@atium/core";
 *
 * export default defineConfig({
 *   adapters: ["playwright"],
 *   quarantine: { mode: "run-and-ignore" },
 * });
 * ```
 */
export function defineConfig(config: AtiumConfigInput): AtiumConfigInput {
  return config;
}
