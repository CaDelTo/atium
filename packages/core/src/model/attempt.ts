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
    /** How the attempt ended. See {@link ATTEMPT_STATUSES}. */
    status: z.enum(ATTEMPT_STATUSES),
    /** When the attempt started. */
    startedAt: TimestampSchema,
    /** How long the attempt took. */
    durationMs: MillisecondsSchema,
    /** Error the attempt failed with. */
    error: ErrorOccurrenceSchema.exactOptional(),
    /** Network activity of the attempt. */
    network: NetworkSummarySchema.exactOptional(),
    /** Browser console output of the attempt. */
    console: z
      .strictObject({
        /** Number of console errors. */
        errors: NonNegativeIntSchema,
        /** Number of console warnings. */
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
    /** Page errors dropped by the cap. */
    pageErrorsDropped: DroppedCountSchema.exactOptional(),
    /** Paths to files, never their content. */
    artifacts: z
      .strictObject({
        /** Path to the trace. */
        trace: TextSchema.exactOptional(),
        /** Paths to the screenshots. */
        screenshots: z.array(TextSchema).readonly().exactOptional(),
        /** Path to the ARIA snapshot, a file apart like the trace and the screenshots. */
        ariaSnapshot: TextSchema.exactOptional(),
        /** Path to the video. */
        video: TextSchema.exactOptional(),
      })
      .readonly()
      .exactOptional(),
  })
  .readonly();

/** One try of a test within a run. See {@link AttemptSchema}. */
export type Attempt = z.infer<typeof AttemptSchema>;
