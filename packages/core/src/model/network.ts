import { z } from "zod";
import { MODEL_LIST_CAPS } from "../defaults.js";
import {
  cappedList,
  DroppedCountSchema,
  MillisecondsSchema,
  NonNegativeIntSchema,
  TextSchema,
} from "./fields.js";

/** A single network request of an attempt (02-data-model.md §9.2). */
export const NetworkCallSchema = z
  .strictObject({
    method: TextSchema,
    /** URL with its variable parts replaced (04-collector.md §12.4). */
    urlTemplate: TextSchema,
    host: TextSchema,
    /** Absent when the request got no response. */
    status: NonNegativeIntSchema.exactOptional(),
    /** Such as `net::ERR_*`, `aborted` or `timeout`. */
    failure: TextSchema.exactOptional(),
    /** Offset from the start of the attempt. */
    startedAtMs: MillisecondsSchema,
    /** Absent while the request was still pending. */
    durationMs: MillisecondsSchema.exactOptional(),
    graphqlOperation: TextSchema.exactOptional(),
  })
  .readonly();

/** A single network request of an attempt. See {@link NetworkCallSchema}. */
export type NetworkCall = z.infer<typeof NetworkCallSchema>;

const NetworkEndpointSchema = z
  .strictObject({
    method: TextSchema,
    urlTemplate: TextSchema,
    count: NonNegativeIntSchema,
    /** Number of responses per status code. */
    statuses: z.record(TextSchema, NonNegativeIntSchema).readonly(),
    failures: NonNegativeIntSchema,
    p95Ms: MillisecondsSchema,
  })
  .readonly();

/** Network activity of an attempt, grouped by endpoint (02-data-model.md §9.2). */
export const NetworkSummarySchema = z
  .strictObject({
    endpoints: cappedList(NetworkEndpointSchema, MODEL_LIST_CAPS.networkEndpoints),
    endpointsDropped: DroppedCountSchema.exactOptional(),
    /** Only in failed attempts or in full capture mode. */
    calls: cappedList(NetworkCallSchema, MODEL_LIST_CAPS.networkCalls).exactOptional(),
    callsDropped: DroppedCountSchema.exactOptional(),
  })
  .readonly();

/** Network activity of an attempt. See {@link NetworkSummarySchema}. */
export type NetworkSummary = z.infer<typeof NetworkSummarySchema>;
