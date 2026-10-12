import { REDACTED_MARKER } from "../defaults.js";

/**
 * Ids of the built-in redaction patterns, in the order they are applied
 * (20-security-privacy.md §28.1).
 */
export const REDACT_PATTERN_IDS = ["jwt", "bearer", "aws-key", "gcp-key", "azure-key"] as const;

/** Id of a built-in redaction pattern. See {@link REDACT_PATTERN_IDS}. */
export type RedactPatternId = (typeof REDACT_PATTERN_IDS)[number];

/**
 * A secret to find in text. When `keepsPrefix` is `true`, the first capture
 * group is a non-secret prefix (such as `Bearer `) kept before the marker.
 */
interface RedactPattern {
  readonly regex: RegExp;
  readonly keepsPrefix: boolean;
}

// Every regex runs in linear time on untrusted text (06-security.md,
// "Entradas"): no nested quantifiers, and each match can only start at the
// beginning of a token, through a negative lookbehind, so a long token is never
// scanned again from each of its characters. A `\b` would not be enough for
// tokens that contain `-`, such as `eyJ-eyJ-eyJ…`.
//
// None of them accepts `[` or `]` inside a token, so a redacted text is not
// redacted again: redaction is idempotent.
const PATTERNS: Readonly<Record<RedactPatternId, RedactPattern>> = {
  // Header and payload are base64url JSON, so they start with `eyJ` (`{"`).
  // The signature may be empty (`alg: none`).
  jwt: { regex: /(?<![\w-])eyJ[\w-]+\.eyJ[\w-]+\.[\w-]*/g, keepsPrefix: false },
  // RFC 6750 b64token; the auth scheme is case-insensitive (RFC 9110 §11.1).
  bearer: { regex: /(?<![\w-])(bearer[ \t]+)[\w.~+/-]+=*/gi, keepsPrefix: true },
  // AWS access key id: a known prefix and 16 base32 characters.
  "aws-key": {
    regex: /(?<![A-Za-z0-9])(?:A3T[A-Z0-9]|AKIA|ASIA|ABIA|ACCA)[A-Z2-7]{16}(?![A-Za-z0-9])/g,
    keepsPrefix: false,
  },
  // Google Cloud API key: `AIza` and 35 base64url characters.
  "gcp-key": { regex: /(?<![\w-])AIza[\w-]{35}(?![\w-])/g, keepsPrefix: false },
  // Azure storage and Service Bus connection strings.
  "azure-key": {
    regex: /(?<!\w)((?:AccountKey|SharedAccessKey)=)[A-Za-z0-9+/]+={0,2}/g,
    keepsPrefix: true,
  },
};

/**
 * Builds a function that replaces every match of the given patterns with
 * {@link REDACTED_MARKER}, applying them in the order of
 * {@link REDACT_PATTERN_IDS}.
 *
 * Each call gets its own copies of the regexes, so redactors share no state.
 *
 * @param ids - Patterns to apply. Duplicates are ignored.
 * @returns A function that redacts a text.
 */
export function createTextRedactor(ids: readonly RedactPatternId[]): (text: string) => string {
  const selected = new Set(ids);
  const patterns = REDACT_PATTERN_IDS.filter((id) => selected.has(id)).map((id) => ({
    regex: new RegExp(PATTERNS[id].regex),
    replacer: PATTERNS[id].keepsPrefix ? keepPrefix : replaceWhole,
  }));
  return (text) =>
    patterns.reduce((redacted, { regex, replacer }) => redacted.replace(regex, replacer), text);
}

function replaceWhole(): string {
  return REDACTED_MARKER;
}

function keepPrefix(_match: string, prefix: string): string {
  return `${prefix}${REDACTED_MARKER}`;
}
