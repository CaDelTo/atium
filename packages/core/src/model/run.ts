import { z } from "zod";
import { MODEL_LIST_CAPS, MODEL_TEXT_CAPS_BYTES } from "../defaults.js";
import {
  cappedList,
  cappedString,
  NonNegativeIntSchema,
  TextSchema,
  TimestampSchema,
} from "./fields.js";
import { RunIdSchema } from "./ids.js";
import { TestResultSchema } from "./test-result.js";

/** Version of the run schema written today. Readers accept it and the previous one (02-data-model.md §9.5). */
export const SCHEMA_VERSION = 1;

/** Every framework a run can come from. */
export const FRAMEWORK_NAMES = ["playwright", "cypress", "junit", "ctrf"] as const;
/** Framework a run comes from. See {@link FRAMEWORK_NAMES}. */
export type FrameworkName = (typeof FRAMEWORK_NAMES)[number];

const PositiveIntSchema = z.int().positive();

const ShardSchema = z
  .strictObject({
    /** 1-based, as in Playwright's `--shard=index/total`. */
    index: PositiveIntSchema,
    total: PositiveIntSchema,
  })
  .refine((shard) => shard.index <= shard.total, {
    message: "Shard index must not be greater than the total number of shards",
    path: ["index"],
  })
  .readonly();

/** One execution of a job or shard, with its results (02-data-model.md §9.2). */
export const RunSchema = z
  .strictObject({
    schemaVersion: z.literal(SCHEMA_VERSION),
    id: RunIdSchema,
    git: z
      .strictObject({
        /** Exact tree tested; the merge commit in a GitHub pull request. */
        commitSha: TextSchema,
        /** Head of the pull request, for links and display. */
        headSha: TextSchema.exactOptional(),
        branch: TextSchema.exactOptional(),
        baseBranch: TextSchema.exactOptional(),
        /** Uncommitted changes, in a local run. */
        dirty: z.boolean(),
      })
      .readonly(),
    ci: z
      .strictObject({
        /** Such as `github`, `gitlab`, `jenkins`, `circleci`, `azure` or `local`. */
        provider: TextSchema,
        runId: TextSchema.exactOptional(),
        /** Re-run of the same workflow, starting at 1. */
        runAttempt: PositiveIntSchema.exactOptional(),
        jobId: TextSchema.exactOptional(),
        shard: ShardSchema.exactOptional(),
        prNumber: PositiveIntSchema.exactOptional(),
      })
      .readonly()
      .exactOptional(),
    environment: z
      .strictObject({
        os: TextSchema,
        arch: TextSchema,
        nodeVersion: TextSchema,
        framework: z
          .strictObject({
            name: z.enum(FRAMEWORK_NAMES),
            version: TextSchema.exactOptional(),
          })
          .readonly(),
      })
      .readonly(),
    frameworkConfig: z
      .strictObject({
        retries: NonNegativeIntSchema.exactOptional(),
        workers: PositiveIntSchema.exactOptional(),
        /** When capped, the first 100. */
        projects: cappedList(
          cappedString(MODEL_TEXT_CAPS_BYTES.frameworkProject),
          MODEL_LIST_CAPS.frameworkProjects,
        ).exactOptional(),
      })
      .readonly()
      .exactOptional(),
    startedAt: TimestampSchema,
    finishedAt: TimestampSchema,
    results: z.array(TestResultSchema).readonly(),
  })
  .readonly();

/** One execution of a job or shard. See {@link RunSchema}. */
export type Run = z.infer<typeof RunSchema>;
