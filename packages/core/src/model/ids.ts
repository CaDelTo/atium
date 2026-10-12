import { z } from "zod";

const HEX_16 = /^[0-9a-f]{16}$/;

/** Identifier of a run: a UUID v7, so ids sort by creation time (02-data-model.md §9.2). */
export const RunIdSchema = z.uuid({ version: "v7" }).brand<"RunId">();
/** Identifier of a run. See {@link RunIdSchema}. */
export type RunId = z.infer<typeof RunIdSchema>;

/**
 * Stable identity of a test across runs: 16 lowercase hex characters of
 * `sha1(project | file | titlePath)` (02-data-model.md §9.3).
 */
export const TestIdSchema = z.string().regex(HEX_16).brand<"TestId">();
/** Stable identity of a test. See {@link TestIdSchema}. */
export type TestId = z.infer<typeof TestIdSchema>;

/**
 * Fingerprint of an error: 16 lowercase hex characters of
 * `sha1(type | normalized message | frames)` (05-fingerprinting.md §13.1).
 */
export const FingerprintSchema = z.string().regex(HEX_16).brand<"Fingerprint">();
/** Fingerprint of an error. See {@link FingerprintSchema}. */
export type Fingerprint = z.infer<typeof FingerprintSchema>;
