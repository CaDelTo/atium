import { z } from "zod";
import { REDACT_DEFAULTS, REDACTED_MARKER } from "../defaults.js";
import { redactFieldsWith } from "./fields.js";
import { createTextRedactor, REDACT_PATTERN_IDS } from "./patterns.js";

const NamesSchema = z.array(z.string().min(1)).readonly();

/**
 * The `redact` section of the config (18-cli-config.md,
 * 20-security-privacy.md §28.1). Each list omitted takes its value from
 * {@link REDACT_DEFAULTS}; a list given replaces its default instead of
 * extending it, so `headers: []` turns header redaction off.
 */
export const RedactConfigSchema = z
  .strictObject({
    /** Header names whose values are replaced, compared case-insensitively. */
    headers: NamesSchema.default(REDACT_DEFAULTS.headers),
    /** Body field names whose values are replaced, compared case-insensitively. */
    bodyFields: NamesSchema.default(REDACT_DEFAULTS.bodyFields),
    /** Built-in patterns searched in every text. */
    patterns: z.array(z.enum(REDACT_PATTERN_IDS)).readonly().default(REDACT_DEFAULTS.patterns),
  })
  .readonly();

/** The `redact` section of the config, with defaults applied. See {@link RedactConfigSchema}. */
export type RedactConfig = z.infer<typeof RedactConfigSchema>;

/** Value of an HTTP header: a single value or one per occurrence. */
export type HeaderValue = string | readonly string[];

/**
 * Removes secrets before they are persisted or logged (06-security.md,
 * "Secretos y datos sensibles"). Every function returns a copy and never
 * changes its input. Applying any of them twice gives the same result as
 * applying it once.
 */
export interface Redactor {
  /**
   * Replaces every match of the configured patterns with `[REDACTED]`. Runs
   * in linear time, so it is safe on untrusted text.
   *
   * Redact before truncating: a secret cut in half may no longer match.
   */
  readonly redact: (text: string) => string;
  /**
   * Replaces the value of each configured header, keeping one marker per
   * occurrence. The values of other headers go through {@link Redactor.redact}.
   */
  readonly redactHeaders: (
    headers: Readonly<Record<string, HeaderValue>>,
  ) => Record<string, HeaderValue>;
  /**
   * Copies a JSON-like value, such as a request body, replacing the value of
   * each configured field at any depth, whatever its type. Every other string
   * goes through {@link Redactor.redact}.
   */
  readonly redactFields: (value: unknown) => unknown;
}

function lowerCaseSet(names: readonly string[]): ReadonlySet<string> {
  return new Set(names.map((name) => name.toLowerCase()));
}

/**
 * Builds the redaction functions for a config.
 *
 * @param config - The `redact` section, already validated; use
 * `RedactConfigSchema.parse({})` for the defaults.
 * @returns The {@link Redactor} for that config.
 *
 * @example
 * ```ts
 * const { redact } = createRedactor(RedactConfigSchema.parse({}));
 * redact("Authorization: Bearer abc.def");
 * // "Authorization: Bearer [REDACTED]"
 * ```
 */
export function createRedactor(config: RedactConfig): Redactor {
  const redact = createTextRedactor(config.patterns);
  const headers = lowerCaseSet(config.headers);
  const bodyFields = lowerCaseSet(config.bodyFields);
  const redactHeaderValue = (name: string, value: HeaderValue): HeaderValue => {
    const replace = headers.has(name.toLowerCase()) ? (): string => REDACTED_MARKER : redact;
    return typeof value === "string" ? replace(value) : value.map((item) => replace(item));
  };

  return {
    redact,
    redactHeaders: (input) =>
      Object.fromEntries(
        Object.entries(input).map(([name, value]) => [name, redactHeaderValue(name, value)]),
      ),
    redactFields: (value) =>
      redactFieldsWith(value, {
        isSensitive: (key) => bodyFields.has(key.toLowerCase()),
        redactText: redact,
      }),
  };
}
