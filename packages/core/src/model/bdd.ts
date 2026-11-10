import { z } from "zod";
import { MODEL_LIST_CAPS, MODEL_TEXT_CAPS_BYTES } from "../defaults.js";
import {
  cappedList,
  cappedString,
  DroppedCountSchema,
  MillisecondsSchema,
  TextSchema,
} from "./fields.js";

const BddStepSchema = z
  .strictObject({
    /** Such as `Given`, `When` or `Then`. */
    keyword: TextSchema,
    /** Text of the step, up to 512 bytes. */
    text: cappedString(MODEL_TEXT_CAPS_BYTES.bddStepText),
    /** Status of the step, as the BDD tool reports it. */
    status: TextSchema,
    /** How long the step took. */
    durationMs: MillisecondsSchema,
    /** Step definition that matched the step, up to 256 bytes. */
    definition: cappedString(MODEL_TEXT_CAPS_BYTES.bddStepDefinition).exactOptional(),
  })
  .readonly();

/** Feature, scenario and steps of a BDD test (02-data-model.md §9.2). */
export const BddContextSchema = z
  .strictObject({
    /** Name of the feature. */
    feature: TextSchema,
    /** Name of the scenario. */
    scenario: TextSchema,
    /** Steps of the scenario. At most 200. */
    steps: cappedList(BddStepSchema, MODEL_LIST_CAPS.bddSteps),
    /** Steps dropped by the cap. */
    stepsDropped: DroppedCountSchema.exactOptional(),
  })
  .readonly();

/** Feature, scenario and steps of a BDD test. See {@link BddContextSchema}. */
export type BddContext = z.infer<typeof BddContextSchema>;
