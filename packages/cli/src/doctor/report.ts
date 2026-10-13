import { RunSchema } from "@atium/core";
import { z } from "zod";

/** Outcome of a check: `fail` makes `atium doctor` exit with code 2, `warn` does not. */
const CHECK_STATUSES = Object.freeze(["pass", "warn", "fail"] as const);

/** The checks of `atium doctor`, in the order they are shown. */
export const CHECK_IDS = Object.freeze([
  "node",
  "config",
  "git",
  "ci",
  "storage",
  "frameworks",
] as const);

const TextSchema = z.string().min(1);

/** What every check has, besides its `id` and `details`. */
const outcome = {
  status: z.enum(CHECK_STATUSES),
  /** What was found, already redacted. */
  message: TextSchema,
  /** How to fix it; present when the status is not `pass`. */
  hint: TextSchema.exactOptional(),
};

const RunGitSchema = RunSchema.unwrap().shape.git;
const RunCiSchema = RunSchema.unwrap().shape.ci.unwrap();

const NodeCheckSchema = z.strictObject({
  id: z.literal("node"),
  ...outcome,
  details: z.strictObject({
    /** Version running, as in `process.versions.node`. */
    version: z.string(),
    /** Lowest version supported. */
    required: TextSchema,
  }),
});

const ConfigCheckSchema = z.strictObject({
  id: z.literal("config"),
  ...outcome,
  details: z.strictObject({
    /** Config file loaded, relative to the working directory when inside it; `null` without one. */
    file: TextSchema.nullable(),
    /** Its `adapters`, or `null` if no config was loaded. */
    adapters: z.array(TextSchema).nullable(),
  }),
});

const GitCheckSchema = z.strictObject({
  id: z.literal("git"),
  ...outcome,
  details: z.strictObject({
    /** Commit checked out, or `null` if Git could not tell. */
    commit: TextSchema.nullable(),
    /** Branch checked out, or `null` on a detached HEAD or if Git could not tell. */
    branch: TextSchema.nullable(),
  }),
});

const CiCheckSchema = z.strictObject({
  id: z.literal("ci"),
  ...outcome,
  /** The `git` and `ci` sections a run would get, or `null` if they could not be detected. */
  details: z.strictObject({ git: RunGitSchema, ci: RunCiSchema }).nullable(),
});

const StorageCheckSchema = z.strictObject({
  id: z.literal("storage"),
  ...outcome,
  details: z.strictObject({
    /** The directory checked, relative to the working directory. */
    directory: TextSchema,
    /** Whether it exists, or `null` if that could not be checked. */
    exists: z.boolean().nullable(),
  }),
});

const FrameworksCheckSchema = z.strictObject({
  id: z.literal("frameworks"),
  ...outcome,
  details: z.strictObject({
    /** Adapters whose framework is a dependency in `package.json`. */
    adapters: z.array(TextSchema),
  }),
});

/** One check of `atium doctor`. A check that does not pass has a `hint`. */
const DoctorCheckSchema = z
  .discriminatedUnion("id", [
    NodeCheckSchema,
    ConfigCheckSchema,
    GitCheckSchema,
    CiCheckSchema,
    StorageCheckSchema,
    FrameworksCheckSchema,
  ])
  .refine((check) => check.status === "pass" || check.hint !== undefined, {
    message: "A check that does not pass needs a hint.",
  });

/**
 * What `atium doctor --format json` writes to stdout (18-cli-config.md
 * §26.1): every check, once and in the order of {@link CHECK_IDS}, and
 * whether none failed. `atium doctor` validates its report against it
 * before writing it.
 */
export const DoctorReportSchema = z
  .strictObject({
    /** `false` if any check failed; warnings do not count. */
    ok: z.boolean(),
    checks: z.array(DoctorCheckSchema),
  })
  .refine(
    (report) =>
      report.checks.length === CHECK_IDS.length &&
      report.checks.every((check, index) => check.id === CHECK_IDS[index]),
    { message: `"checks" must have the checks ${CHECK_IDS.join(", ")}, in that order.` },
  )
  .refine((report) => report.ok === report.checks.every((check) => check.status !== "fail"), {
    message: '"ok" must be false exactly when a check failed.',
  });

/** One of {@link CHECK_STATUSES}. */
export type CheckStatus = (typeof CHECK_STATUSES)[number];

/** One of {@link CHECK_IDS}. */
type CheckId = (typeof CHECK_IDS)[number];

/** A check of `atium doctor`. */
export type DoctorCheck = z.infer<typeof DoctorCheckSchema>;

/** The check with the given `id`. */
export type DoctorCheckOf<Id extends CheckId> = Extract<DoctorCheck, { readonly id: Id }>;

/** The report of `atium doctor`. */
export type DoctorReport = z.infer<typeof DoctorReportSchema>;
