import { z } from "zod";
import { MODEL_TEXT_CAPS_BYTES } from "../defaults.js";
import { cappedString, MillisecondsSchema, TextSchema } from "./fields.js";
import { FingerprintSchema } from "./ids.js";

const MatcherValueSchema = cappedString(MODEL_TEXT_CAPS_BYTES.matcherValue);

/** An error of an attempt (02-data-model.md §9.2). Texts are redacted plain text, without ANSI codes. */
export const ErrorOccurrenceSchema = z
  .strictObject({
    /** Groups occurrences of the same error (05-fingerprinting.md §13.1). */
    fingerprint: FingerprintSchema,
    /** Coarse grouping by type and location (05-fingerprinting.md §13.2). */
    family: TextSchema,
    /** Such as `TimeoutError` or `AssertionError`. */
    type: TextSchema,
    message: cappedString(MODEL_TEXT_CAPS_BYTES.errorMessage),
    stack: cappedString(MODEL_TEXT_CAPS_BYTES.errorStack).exactOptional(),
    /** Present when the error involves a locator. */
    locator: TextSchema.exactOptional(),
    matcher: z
      .strictObject({
        name: TextSchema,
        expected: MatcherValueSchema.exactOptional(),
        actual: MatcherValueSchema.exactOptional(),
      })
      .readonly()
      .exactOptional(),
    /** Offset from the start of the attempt. */
    failedAtMs: MillisecondsSchema,
  })
  .readonly();

/** An error of an attempt. See {@link ErrorOccurrenceSchema}. */
export type ErrorOccurrence = z.infer<typeof ErrorOccurrenceSchema>;
