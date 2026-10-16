import { createWriteStream } from "node:fs";
import { lstat, mkdir, mkdtemp, rename, rm } from "node:fs/promises";
import * as path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createGzip } from "node:zlib";
import type { z } from "zod";
import {
  RUN_DIRECTORY_MODE,
  RUN_FILE_MODE,
  RUN_FILE_TEMPORARY_REMOVE_RETRIES,
  RUNS_DIRECTORY,
} from "../defaults.js";
import { errnoCode } from "../errno.js";
import { AtiumError, isAtiumError } from "../errors.js";
import type { Logger } from "../logger.js";
import type { Run } from "../model/run.js";
import { quoteForMessage } from "../quote.js";
import { describeIssues } from "../zod-issues.js";
import { capRunHeader, capTestResult } from "./cap-run.js";
import { fitTestResultLine } from "./fit-line.js";
import type { RunHeader } from "./run-file-format.js";
import { CURRENT_RUN_FILE_SCHEMAS } from "./run-file-format.js";

// I/O edge of `core`: writes run files (02-code-design.md). Each run is an
// immutable file (ADR-0007) in the format of ADR-0018.

/** Options of {@link writeRunFile}. */
export interface WriteRunFileOptions {
  /** Repository root. The file goes to `<rootDir>/.atium/runs/<runId>.ndjson.gz`. */
  readonly rootDir: string;
  /** Receives a warning when the temporary directory cannot be removed. */
  readonly logger: Logger;
}

/** Removes a directory tree. A parameter of {@link writeRunFileWith}, so tests can make it fail. */
export type RemoveDirectory = (directory: string) => Promise<void>;

/** Retries absorb short locks, such as an antivirus scanning the new file on Windows. */
const removeDirectory: RemoveDirectory = (directory) =>
  rm(directory, { recursive: true, force: true, maxRetries: RUN_FILE_TEMPORARY_REMOVE_RETRIES });

/**
 * Path of the run file of `runId` under `rootDir`.
 *
 * @param rootDir - Repository root.
 * @param runId - Id of the run; a valid `RunId` never escapes the directory.
 * @returns Absolute path of `<rootDir>/.atium/runs/<runId>.ndjson.gz`.
 */
export function runFilePath(rootDir: string, runId: string): string {
  return path.resolve(rootDir, RUNS_DIRECTORY, `${runId}.ndjson.gz`);
}

/**
 * Writes a run to `.atium/runs/<runId>.ndjson.gz` in the format of ADR-0018:
 * the header on line 1 and one `TestResult` per line.
 *
 * Before validating, it removes ANSI codes and applies the list and text caps
 * of ADR-0018; a result whose line is still over 768 KiB has its detail
 * trimmed and is marked `detailTruncated`. So every line it writes is one the
 * reader accepts. The `testId` is kept as it is.
 *
 * The write is atomic: the file is written in a temporary directory next to
 * it and then renamed, so readers never see a partial file. Run files are
 * immutable (ADR-0007): an existing file is never replaced. The file and the
 * directories it creates are readable only by their owner.
 *
 * Texts are written as they come, apart from the ANSI codes and the caps:
 * the caller redacts them first (20-security-privacy.md §28.1).
 *
 * @param run - Run to write, possibly over the caps.
 * @param options - Where to write it.
 * @returns Absolute path of the file written.
 * @throws {@link AtiumError} `MODEL_INVALID` if the run is invalid even after
 * the caps, such as a malformed `testId`; `STORAGE_CONFLICT` if the file
 * already exists; `STORAGE_UNAVAILABLE` if it cannot be written.
 *
 * @example
 * ```ts
 * const file = await writeRunFile(run, { rootDir: repoRoot, logger });
 * ```
 */
export function writeRunFile(run: Run, options: WriteRunFileOptions): Promise<string> {
  return writeRunFileWith(run, options, removeDirectory);
}

/**
 * {@link writeRunFile} with the function that removes the temporary
 * directory. Internal: tests pass one that fails.
 *
 * @param run - Run to write.
 * @param options - Where to write it and where to warn.
 * @param remove - Removes the temporary directory.
 * @returns Absolute path of the file written.
 * @throws {@link AtiumError} as {@link writeRunFile} does.
 */
export async function writeRunFileWith(
  run: Run,
  options: WriteRunFileOptions,
  remove: RemoveDirectory,
): Promise<string> {
  const { results, ...header } = run;
  // Validated before anything touches the disk: the id becomes the file name.
  const validHeader = validateHeader(header);
  const target = runFilePath(options.rootDir, validHeader.id);
  let temporaryDirectory: string;
  try {
    const directory = path.dirname(target);
    // Owner only, like the directories of the SQLite database (15-storage.md §23.2.1).
    await mkdir(directory, { recursive: true, mode: RUN_DIRECTORY_MODE });
    temporaryDirectory = await mkdtemp(path.join(directory, ".tmp-"));
  } catch (error) {
    throw writeError(target, error);
  }
  try {
    const temporary = path.join(temporaryDirectory, path.basename(target));
    await pipeline(
      Readable.from(runFileLines(validHeader, results)),
      createGzip(),
      // Owner only: the file holds error messages, stacks and network calls.
      createWriteStream(temporary, { flags: "wx", flush: true, mode: RUN_FILE_MODE }),
    );
    await publish(temporary, target);
    return target;
  } catch (error) {
    throw isAtiumError(error) ? error : writeError(target, error);
  } finally {
    await removeTemporary(temporaryDirectory, remove, options.logger);
  }
}

/**
 * Removes the temporary directory without changing the outcome of the write:
 * by now the file is published or the write failed with a more useful error,
 * and a leftover `.tmp-*` directory holds no run that readers would see.
 */
async function removeTemporary(
  directory: string,
  remove: RemoveDirectory,
  logger: Logger,
): Promise<void> {
  try {
    await remove(directory);
  } catch (error) {
    logger.warn("Could not remove the temporary directory of a run file; delete it by hand", {
      directory,
      error,
    });
  }
}

/** The lines of the file, each ending in `\n`, capped and validated one by one. */
function* runFileLines(header: RunHeader, results: Run["results"]): Generator<string> {
  yield `${JSON.stringify(header)}\n`;
  for (const [index, result] of results.entries()) {
    const valid = validate(
      CURRENT_RUN_FILE_SCHEMAS.result,
      capTestResult(result),
      `Result ${String(index)} (test ${quoteForMessage(result.test.testId)})`,
    );
    yield `${fitTestResultLine(valid).line}\n`;
  }
}

function validateHeader(header: RunHeader): RunHeader {
  return validate(CURRENT_RUN_FILE_SCHEMAS.header, capRunHeader(header), "The run header");
}

function validate<T>(schema: z.ZodType<T>, value: unknown, subject: string): T {
  const parsed = schema.safeParse(value);
  if (parsed.success) {
    return parsed.data;
  }
  const issues = describeIssues(parsed.error.issues);
  throw new AtiumError(
    "MODEL_INVALID",
    `${subject} cannot be written to a run file, even after the size caps (${issues}).`,
    // Not the `ZodError` as `cause`: its message lists every issue with paths
    // that may hold run data, and loggers print the cause. The message above
    // carries the bounded summary.
    { hint: "This is a bug in the adapter that built the run. Report it with this message." },
  );
}

/**
 * Publishes the temporary file under its final name with `rename`, as
 * ADR-0018 says. `rename` replaces an existing file silently, so the name is
 * checked first to keep run files immutable (ADR-0007). Run ids are UUID v7,
 * so two writers racing for the same name between the check and the rename
 * is not expected.
 */
async function publish(temporary: string, target: string): Promise<void> {
  if (await exists(target)) {
    throw new AtiumError(
      "STORAGE_CONFLICT",
      `Run file ${quoteForMessage(target)} already exists; run files are never replaced.`,
      { hint: "Give each run a new id, or delete the old file if it is not needed." },
    );
  }
  await rename(temporary, target);
}

/** Whether `file` exists. `lstat`, so a dangling symbolic link also counts. */
async function exists(file: string): Promise<boolean> {
  try {
    await lstat(file);
    return true;
  } catch (error) {
    if (errnoCode(error) === "ENOENT") {
      return false;
    }
    throw error;
  }
}

function writeError(target: string, error: unknown): AtiumError {
  return new AtiumError(
    "STORAGE_UNAVAILABLE",
    `Could not write run file ${quoteForMessage(target)}.`,
    {
      cause: error,
      hint: "Check that the directory exists, is writable and has free space.",
    },
  );
}
