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

// Characters that end a credential value: whitespace, quotes, angle brackets,
// `,` and `;` (JSON, headers, connection strings), and `[` and `]`, so that a
// marker is never part of a value.
const VALUE = String.raw`[^\s"'<>,;[\]]+`;

// Every regex runs in linear time on untrusted text (06-security.md,
// "Entradas"): no nested quantifiers, and each match can only start at a token
// boundary, through a negative lookbehind over the characters of the token's
// own alphabet. So a long token is never scanned again from each of its
// characters; a `\b` would not be enough for base64url tokens, which contain
// `-`, such as `eyJ-eyJ-eyJ…`.
//
// None of them accepts `[` or `]` inside a token, so a redacted text is not
// redacted again: redaction is idempotent.
const PATTERNS: Readonly<Record<RedactPatternId, RedactPattern>> = {
  // Header and payload are base64url JSON, so they start with `eyJ` (`{"`).
  // The signature may be empty (`alg: none`), but its `.` is required.
  jwt: { regex: /(?<![\w-])eyJ[\w-]+\.eyJ[\w-]+\.[\w-]*/g, keepsPrefix: false },
  // The auth scheme is case-insensitive (RFC 9110 §11.1). The token runs up to
  // a delimiter rather than over the RFC 6750 alphabet, so a URL-encoded or
  // malformed token is not left half redacted.
  bearer: {
    regex: new RegExp(String.raw`(?<![\w-])(bearer[ \t]+)${VALUE}`, "gi"),
    keepsPrefix: true,
  },
  // AWS access key id: a known prefix and 16 base32 characters. `_` and `-`
  // are not part of its alphabet, so `KEY_AKIA…` matches.
  "aws-key": {
    regex: /(?<![A-Za-z0-9])(?:A3T[A-Z0-9]|AKIA|ASIA|ABIA|ACCA)[A-Z2-7]{16}(?![A-Za-z0-9])/g,
    keepsPrefix: false,
  },
  // Google Cloud API key: `AIza` and 35 base64url characters.
  "gcp-key": { regex: /(?<![\w-])AIza[\w-]{35}(?![\w-])/g, keepsPrefix: false },
  // Azure storage and Service Bus connection strings. Azure parses their keys
  // case-insensitively and allows spaces around `=`.
  "azure-key": {
    regex: new RegExp(
      String.raw`(?<![\w-])((?:AccountKey|SharedAccessKey)[ \t]*=[ \t]*)${VALUE}`,
      "gi",
    ),
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
