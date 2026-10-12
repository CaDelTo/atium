import { z } from "zod";
import { MODEL_TEXT_CAPS_BYTES } from "../defaults.js";
import { jsonEscapedByteLength } from "./text.js";

/**
 * String of at most `maxBytes` UTF-8 bytes once escaped for JSON (ADR-0018).
 *
 * The length check comes first and aborts: a string never has more UTF-16
 * code units than escaped bytes, so it rejects huge strings without measuring
 * them, and it gives the JSON Schema a `maxLength` that is a safe upper bound.
 */
export function cappedString(maxBytes: number): z.ZodString {
  return z
    .string()
    .max(maxBytes, { abort: true })
    .refine((value) => jsonEscapedByteLength(value) <= maxBytes, {
      message: `Too big: expected string to have <=${String(maxBytes)} UTF-8 bytes once escaped for JSON`,
    });
}

/** Any string of the model without a cap of its own. */
export const TextSchema = cappedString(MODEL_TEXT_CAPS_BYTES.default);

/** Readonly list of at most `maxItems` items. */
export function cappedList<T extends z.ZodType>(
  item: T,
  maxItems: number,
): z.ZodReadonly<z.ZodArray<T>> {
  return z.array(item).max(maxItems).readonly();
}

/** Count, index or position: an integer ≥ 0. */
export const NonNegativeIntSchema = z.int().nonnegative();

/** Duration or time offset in whole milliseconds (01-typescript.md). */
export const MillisecondsSchema = z.int().nonnegative();

/** Items dropped by a list cap. Positive; the field is omitted when nothing was dropped. */
export const DroppedCountSchema = z.int().positive();

/**
 * ISO 8601 date in UTC, such as `2026-10-08T14:03:00.000Z` (01-typescript.md).
 *
 * Capped like any other string (ADR-0018): the format allows any number of
 * fractional digits. A valid date is ASCII without escapes, so its length is
 * its size in bytes.
 */
export const TimestampSchema = z.iso.datetime().max(MODEL_TEXT_CAPS_BYTES.default);
