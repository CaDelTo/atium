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
    /** Number of shards of the job. */
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
    /** Version of the schema the run was written with. See {@link SCHEMA_VERSION}. */
    schemaVersion: z.literal(SCHEMA_VERSION),
    /** UUID v7, so runs sort by time. */
    id: RunIdSchema,
    /** Commit and branch tested. */
    git: z
      .strictObject({
        /** Exact tree tested; the merge commit in a GitHub pull request. */
        commitSha: TextSchema,
        /** Head of the pull request, for links and display. */
        headSha: TextSchema.exactOptional(),
        /** Branch tested, when known. */
        branch: TextSchema.exactOptional(),
        /** Target branch of the pull request. */
        baseBranch: TextSchema.exactOptional(),
        /** Uncommitted changes, in a local run. */
        dirty: z.boolean(),
      })
      .readonly(),
    /** CI job the run belongs to (02-data-model.md §10). */
    ci: z
      .strictObject({
        /** Such as `github`, `gitlab`, `jenkins`, `circleci`, `azure` or `local`. */
        provider: TextSchema,
        /**
         * Run of the CI workflow or pipeline. Shards with the same `runId` and
         * `runAttempt` form one logical run (02-data-model.md §9.4).
         */
        runId: TextSchema.exactOptional(),
        /** Re-run of the same workflow, starting at 1. */
        runAttempt: PositiveIntSchema.exactOptional(),
        /** Job within the CI run. */
        jobId: TextSchema.exactOptional(),
        /** Shard of the job, when the suite is split; each shard writes its own run. */
        shard: ShardSchema.exactOptional(),
        /** Number of the pull or merge request, when the run is for one. */
        prNumber: PositiveIntSchema.exactOptional(),
      })
      .readonly()
      .exactOptional(),
    /** Where the tests ran. */
    environment: z
      .strictObject({
        /** Operating system. */
        os: TextSchema,
        /** CPU architecture. */
        arch: TextSchema,
        /** Version of Node.js. */
        nodeVersion: TextSchema,
        /** Test framework that ran the suite. */
        framework: z
          .strictObject({
            /** See {@link FRAMEWORK_NAMES}. */
            name: z.enum(FRAMEWORK_NAMES),
            /** Version of the framework, when known. */
            version: TextSchema.exactOptional(),
          })
          .readonly(),
      })
      .readonly(),
    /** Settings the framework ran with. */
    frameworkConfig: z
      .strictObject({
        /** Retries allowed per test. */
        retries: NonNegativeIntSchema.exactOptional(),
        /** Parallel workers. */
        workers: PositiveIntSchema.exactOptional(),
        /** Names of the framework's projects, such as Playwright's. When capped, the first 100. */
        projects: cappedList(
          cappedString(MODEL_TEXT_CAPS_BYTES.frameworkProject),
          MODEL_LIST_CAPS.frameworkProjects,
        ).exactOptional(),
      })
      .readonly()
      .exactOptional(),
    /** When the run started. */
    startedAt: TimestampSchema,
    /** When the run finished. */
    finishedAt: TimestampSchema,
    /** Final result of each test of the run. */
    results: z.array(TestResultSchema).readonly(),
  })
  .readonly();

/** One execution of a job or shard. See {@link RunSchema}. */
export type Run = z.infer<typeof RunSchema>;
