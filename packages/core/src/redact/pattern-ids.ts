// A leaf module with no imports, so that both `defaults.ts` and `patterns.ts`
// can use the catalog of patterns without an import cycle.

/**
 * Ids of the built-in redaction patterns, in the order they are applied
 * (20-security-privacy.md §28.1).
 */
export const REDACT_PATTERN_IDS = ["jwt", "bearer", "aws-key", "gcp-key", "azure-key"] as const;

/** Id of a built-in redaction pattern. See {@link REDACT_PATTERN_IDS}. */
export type RedactPatternId = (typeof REDACT_PATTERN_IDS)[number];
