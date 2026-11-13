import type { z } from "zod";
import type { Finding, FindingSchema } from "../findings/finding.js";

type FindingInput = z.input<typeof FindingSchema>;

/** Immutable builder of a {@link Finding}. Every method returns a new builder. */
export interface FindingBuilder {
  /**
   * Overrides any field of the finding.
   *
   * @param patch - Fields to set. They are copied, so changing `patch`
   *   afterwards does not change the builder.
   * @returns A new builder with those fields.
   */
  with(patch: Partial<FindingInput>): FindingBuilder;
  /**
   * Builds the finding, validated by `FindingSchema`.
   *
   * @returns A frozen finding.
   * @throws `ZodError` if the fields set make the finding invalid.
   */
  build(): Finding;
}

/**
 * Starts a builder of a valid finding with only the required fields: an
 * `E2E001` warning of the `lint` analyzer.
 *
 * @returns A builder; call `build()` to get the finding.
 */
export function aFinding(): FindingBuilder {
  throw new Error("not implemented");
}
