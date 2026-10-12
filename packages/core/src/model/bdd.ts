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
    keyword: TextSchema,
    text: cappedString(MODEL_TEXT_CAPS_BYTES.bddStepText),
    status: TextSchema,
    durationMs: MillisecondsSchema,
    definition: cappedString(MODEL_TEXT_CAPS_BYTES.bddStepDefinition).exactOptional(),
  })
  .readonly();

/** Feature, scenario and steps of a BDD test (02-data-model.md §9.2). */
export const BddContextSchema = z
  .strictObject({
    feature: TextSchema,
    scenario: TextSchema,
    steps: cappedList(BddStepSchema, MODEL_LIST_CAPS.bddSteps),
    stepsDropped: DroppedCountSchema.exactOptional(),
  })
  .readonly();

/** Feature, scenario and steps of a BDD test. See {@link BddContextSchema}. */
export type BddContext = z.infer<typeof BddContextSchema>;
