import { z } from "zod";
import { MODEL_LIST_CAPS, MODEL_TEXT_CAPS_BYTES } from "../defaults.js";
import { ErrorOccurrenceSchema } from "./error-occurrence.js";
import {
  cappedList,
  cappedString,
  DroppedCountSchema,
  MillisecondsSchema,
  NonNegativeIntSchema,
  TextSchema,
  TimestampSchema,
} from "./fields.js";
import { NetworkSummarySchema } from "./network.js";

/** Every status an attempt can end with. */
export const ATTEMPT_STATUSES = ["passed", "failed", "timedOut", "interrupted", "skipped"] as const;
/** Status an attempt ended with. See {@link ATTEMPT_STATUSES}. */
export type AttemptStatus = (typeof ATTEMPT_STATUSES)[number];

/** One try of a test within a run: 0 is the original, 1..n are retries (02-data-model.md §9.2). */
export const AttemptSchema = z
  .strictObject({
    /** Original index, kept when attempts are capped so the gap stays visible. */
    index: NonNegativeIntSchema,
    status: z.enum(ATTEMPT_STATUSES),
    startedAt: TimestampSchema,
    durationMs: MillisecondsSchema,
    error: ErrorOccurrenceSchema.exactOptional(),
    network: NetworkSummarySchema.exactOptional(),
    console: z
      .strictObject({
        errors: NonNegativeIntSchema,
        warnings: NonNegativeIntSchema,
        /** Redacted, without ANSI codes. */
        samples: cappedList(
          cappedString(MODEL_TEXT_CAPS_BYTES.consoleSample),
          MODEL_LIST_CAPS.consoleSamples,
        ),
      })
      .readonly()
      .exactOptional(),
    /** Uncaught JavaScript exceptions, without ANSI codes. When capped, the last 20. */
    pageErrors: cappedList(
      cappedString(MODEL_TEXT_CAPS_BYTES.pageError),
      MODEL_LIST_CAPS.pageErrors,
    ).exactOptional(),
    pageErrorsDropped: DroppedCountSchema.exactOptional(),
    /** Paths to files, never their content. */
    artifacts: z
      .strictObject({
        trace: TextSchema.exactOptional(),
        screenshots: z.array(TextSchema).readonly().exactOptional(),
        ariaSnapshot: TextSchema.exactOptional(),
        video: TextSchema.exactOptional(),
      })
      .readonly()
      .exactOptional(),
  })
  .readonly();

/** One try of a test within a run. See {@link AttemptSchema}. */
export type Attempt = z.infer<typeof AttemptSchema>;
