import { z } from "zod";
import { REDACT_DEFAULTS, REDACTED_MARKER } from "../defaults.js";
import { redactFieldsWith } from "./fields.js";
import { createTextRedactor, REDACT_PATTERN_IDS } from "./patterns.js";

/** Removes everything but letters and digits, in any script. */
const SEPARATORS = /[^\p{L}\p{N}]/gu;

function normalizeName(name: string): string {
  return name.toLowerCase().replace(SEPARATORS, "");
}

// A fragment that normalizes to "" would match every name.
const NamesSchema = z
  .array(
    z.string().refine((name) => normalizeName(name) !== "", {
      message: "Use a name with at least one letter or digit.",
    }),
  )
  .readonly();

/**
 * The `redact` section of the config (18-cli-config.md §26.3,
 * 20-security-privacy.md §28.1). Each list omitted takes its value from
 * {@link REDACT_DEFAULTS}; a list given replaces its default instead of
 * extending it. So `headers: []` stops replacing headers by name, although
 * their values still go through the patterns.
 *
 * `headers` and `bodyFields` hold name fragments, compared without case and
 * separators: `apiKey` matches `x-api-key` and `API_KEY_ID`.
 */
export const RedactConfigSchema = z
  .strictObject({
    /** Fragments of the header names whose values are replaced. */
    headers: NamesSchema.default(REDACT_DEFAULTS.headers),
    /** Fragments of the body field names whose values are replaced. */
    bodyFields: NamesSchema.default(REDACT_DEFAULTS.bodyFields),
    /** Built-in patterns searched in every text, always in the order of `REDACT_PATTERN_IDS`. */
    patterns: z.array(z.enum(REDACT_PATTERN_IDS)).readonly().default(REDACT_DEFAULTS.patterns),
  })
  .readonly();

/** The `redact` section of the config, with defaults applied. See {@link RedactConfigSchema}. */
export type RedactConfig = z.infer<typeof RedactConfigSchema>;

/** Value of an HTTP header: a single value or one per occurrence. */
export type HeaderValue = string | readonly string[];

/**
 * Removes secrets before they are persisted or logged (06-security.md,
 * "Secretos y datos sensibles"). No function changes its input or throws, and
 * applying any of them twice gives the same result as applying it once.
 */
export interface Redactor {
  /**
   * Replaces every match of the configured patterns with `[REDACTED]`. Runs
   * in linear time, so it is safe on untrusted text.
   *
   * Redact before truncating: a secret cut in half may no longer match.
   *
   * @param text - Any text, such as an error message, a stack or a log line.
   * @returns The text with each secret replaced.
   */
  readonly redact: (text: string) => string;
  /**
   * Replaces the value of each sensitive header, keeping one marker per
   * occurrence when the value is an array. The values of other headers go
   * through {@link Redactor.redact}.
   *
   * @param headers - Header names and values, in any case.
   * @returns A new object with the same names.
   */
  readonly redactHeaders: (
    headers: Readonly<Record<string, HeaderValue>>,
  ) => Record<string, HeaderValue>;
  /**
   * Redacts a JSON value, such as a parsed request body. Arrays and plain
   * objects are copied at any depth, replacing the value of each sensitive
   * field whatever its type; every other string goes through
   * {@link Redactor.redact}.
   *
   * Only JSON values are walked: anything else, such as an `Error`, a `Map` or
   * a class instance, is returned as it is, unredacted. Parse a body before
   * passing it; a body still in text form only goes through the patterns, so
   * its sensitive fields are not replaced.
   *
   * @param value - Typically the result of `JSON.parse`.
   * @returns The redacted copy, or `value` itself if it is not a string, an
   * array or a plain object.
   */
  readonly redactFields: (value: unknown) => unknown;
}

/** Tells whether a name, normalized, contains any of the normalized fragments. */
function nameMatcher(fragments: readonly string[]): (name: string) => boolean {
  const normalized = [...new Set(fragments.map(normalizeName))];
  return (name) => {
    const candidate = normalizeName(name);
    return normalized.some((fragment) => candidate.includes(fragment));
  };
}

/**
 * Builds the redaction functions for a config.
 *
 * @param config - The `redact` section, already validated; use
 * `RedactConfigSchema.parse({})` for the defaults. Never throws: validation
 * errors are raised by `RedactConfigSchema.parse`, as a `ZodError`.
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
  const isSensitiveHeader = nameMatcher(config.headers);
  const isSensitiveField = nameMatcher(config.bodyFields);
  const redactHeaderValue = (name: string, value: HeaderValue): HeaderValue => {
    const replace = isSensitiveHeader(name) ? (): string => REDACTED_MARKER : redact;
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
        isSensitive: isSensitiveField,
        redactText: redact,
      }),
  };
}
