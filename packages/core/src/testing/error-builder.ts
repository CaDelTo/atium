import type { z } from "zod";
import { ErrorOccurrenceSchema } from "../model/error-occurrence.js";
import type { ErrorOccurrence } from "../model/error-occurrence.js";
import { seededHex } from "./deterministic.js";

type ErrorInput = z.input<typeof ErrorOccurrenceSchema>;

type ErrorState = Readonly<
  Omit<ErrorInput, "fingerprint" | "family"> & Partial<Pick<ErrorInput, "fingerprint" | "family">>
>;

/** Immutable builder of an {@link ErrorOccurrence}. Every method returns a new builder. */
export interface ErrorBuilder {
  /**
   * Sets the message.
   *
   * @param message - Message of the error.
   * @returns A new builder with that message.
   */
  withMessage(message: string): ErrorBuilder;
  /**
   * Overrides any field of the error.
   *
   * @param patch - Fields to set. They are copied, so changing `patch`
   *   afterwards does not change the builder.
   * @returns A new builder with those fields.
   */
  with(patch: Partial<ErrorInput>): ErrorBuilder;
  /**
   * Builds the error, validated by {@link ErrorOccurrenceSchema}.
   *
   * @returns A frozen error. Unless set, `fingerprint` is derived from `type`
   *   and `message`, and `family` from `type`.
   * @throws `ZodError` if the fields set make the error invalid.
   */
  build(): ErrorOccurrence;
}

function errorBuilder(state: ErrorState): ErrorBuilder {
  return Object.freeze({
    withMessage: (message: string) => errorBuilder({ ...state, message }),
    with: (patch: Partial<ErrorInput>) => errorBuilder({ ...state, ...structuredClone(patch) }),
    build: () =>
      ErrorOccurrenceSchema.parse({
        fingerprint: seededHex(JSON.stringify([state.type, state.message])),
        family: seededHex(`family:${state.type}`),
        ...state,
      }),
  });
}

/**
 * Starts an {@link ErrorBuilder} with valid, deterministic defaults.
 *
 * @example
 * ```ts
 * const error = anError("AssertionError").withMessage("expected 2 to be 3").build();
 * ```
 *
 * @param type - Type of the error, such as `TimeoutError` or `AssertionError`.
 * @returns A builder of an error with that type.
 */
export function anError(type = "TimeoutError"): ErrorBuilder {
  return errorBuilder({ type, message: "Timeout 5000ms exceeded.", failedAtMs: 1000 });
}
