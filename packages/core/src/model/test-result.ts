import { z } from "zod";
import { MODEL_LIST_CAPS } from "../defaults.js";
import { AttemptSchema } from "./attempt.js";
import { BddContextSchema } from "./bdd.js";
import { cappedList, DroppedCountSchema, NonNegativeIntSchema } from "./fields.js";
import { TestCaseSchema } from "./test-case.js";

/** Every final outcome of a test in a run. `flaky` means it failed and then passed in the same run. */
export const TEST_OUTCOMES = ["passed", "failed", "flaky", "skipped"] as const;
/** Final outcome of a test in a run. See {@link TEST_OUTCOMES}. */
export type TestOutcome = (typeof TEST_OUTCOMES)[number];

/** Final result of a test in a run, with its attempts (02-data-model.md §9.2). One line of a run file. */
export const TestResultSchema = z
  .strictObject({
    test: TestCaseSchema,
    outcome: z.enum(TEST_OUTCOMES),
    /** When capped, the first and the last 19. */
    attempts: cappedList(AttemptSchema, MODEL_LIST_CAPS.attempts),
    attemptsDropped: DroppedCountSchema.exactOptional(),
    workerIndex: NonNegativeIntSchema.exactOptional(),
    /** Execution order within the worker. */
    sequenceInWorker: NonNegativeIntSchema.exactOptional(),
    quarantined: z.boolean(),
    bdd: BddContextSchema.exactOptional(),
    /** Present when the writer trimmed detail to keep the line under its size limit (ADR-0018). */
    detailTruncated: z.literal(true).exactOptional(),
  })
  .readonly();

/** Final result of a test in a run. See {@link TestResultSchema}. */
export type TestResult = z.infer<typeof TestResultSchema>;
