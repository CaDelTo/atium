import { z } from "zod";
import { MODEL_LIST_CAPS } from "../defaults.js";
import { cappedList, TextSchema } from "./fields.js";
import { TestIdSchema } from "./ids.js";

/** Stable identity of a test across runs (02-data-model.md §9.2, §9.3). */
export const TestCaseSchema = z
  .strictObject({
    /** Computed from the original `project`, `file` and `titlePath`, before any cap. */
    testId: TestIdSchema,
    /** Playwright project or browser. */
    project: TextSchema.exactOptional(),
    /** POSIX path, relative to the repository root. */
    file: TextSchema,
    /** `describe › describe › test`. When capped, the first level and the last 19. */
    titlePath: cappedList(TextSchema, MODEL_LIST_CAPS.titlePathLevels),
    /** Such as `@smoke` or `@slow`. When capped, the first 50. */
    tags: cappedList(TextSchema, MODEL_LIST_CAPS.tags),
    /** 1-based position of the test in `file`. */
    location: z
      .strictObject({ line: z.int().positive(), column: z.int().positive() })
      .readonly()
      .exactOptional(),
  })
  .readonly();

/** Stable identity of a test across runs. See {@link TestCaseSchema}. */
export type TestCase = z.infer<typeof TestCaseSchema>;
