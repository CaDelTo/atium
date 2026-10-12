import { createReadStream } from "node:fs";
import { createGunzip } from "node:zlib";
import type { z } from "zod";
import { RUN_FILE_READ_LIMITS } from "../defaults.js";
import { errnoCode } from "../errno.js";
import { AtiumError, isAtiumError } from "../errors.js";
import type { Run } from "../model/run.js";
import type { TestResult } from "../model/test-result.js";
import { quoteForMessage } from "../quote.js";
import { describeIssues } from "../zod-issues.js";
import type { ExceededLimit, LineEvent, LineLimits } from "./line-reader.js";
import { splitLines } from "./line-reader.js";
import type { RunFileSchemas, RunHeader } from "./run-file-format.js";
import { RUN_FILE_SCHEMAS, SchemaVersionProbe } from "./run-file-format.js";

// I/O edge of `core`: reads run files (02-code-design.md). They may come from
// a shared bucket or from other jobs, so they are untrusted input: sizes are
// limited while streaming and every line is validated (ADR-0018).

/** What {@link readRunFileEntries} yields: the header first, then each result. */
export type RunFileEntry =
  | {
      /** Line 1: always the first entry. */
      readonly kind: "header";
      /** The run without `results`. */
      readonly header: RunHeader;
    }
  | {
      /** A following line. */
      readonly kind: "result";
      /** The result of one test. */
      readonly result: TestResult;
      /** Its line number in the file, from 2. */
      readonly line: number;
    };

/** A line of a run file, for error messages. */
interface LineLocation {
  readonly file: string;
  readonly line: number;
}

const LIMIT_NAMES: Readonly<Record<ExceededLimit, string>> = {
  firstLine: "header line limit",
  line: "result line limit",
  total: "total size limit",
};

const CORRUPT_FILE_HINT =
  "The file is damaged or was not written by Atium. Delete it and run the suite again.";

/**
 * Reads a run file as a stream: yields its header and then each `TestResult`,
 * one line at a time, validated with Zod. Breaking out of the loop closes the
 * file.
 *
 * @param file - Path of a `.ndjson.gz` run file.
 * @returns The header, then each result in file order. The file is opened
 * when iteration starts.
 * @throws {@link AtiumError} `MODEL_INVALID` with the line number if the
 * file goes over a size limit of ADR-0018, is not valid gzip, UTF-8, JSON or
 * model, or has an unsupported `schemaVersion`; `STORAGE_UNAVAILABLE` if it
 * cannot be read.
 *
 * @example
 * ```ts
 * for await (const entry of readRunFileEntries(file)) {
 *   if (entry.kind === "result") {
 *     count(entry.result);
 *   }
 * }
 * ```
 */
export function readRunFileEntries(file: string): AsyncGenerator<RunFileEntry> {
  return readRunFileEntriesWithin(file, {
    firstLineBytes: RUN_FILE_READ_LIMITS.headerBytes,
    lineBytes: RUN_FILE_READ_LIMITS.resultLineBytes,
    totalBytes: RUN_FILE_READ_LIMITS.totalBytes,
  });
}

/**
 * {@link readRunFileEntries} with the given limits instead of those of
 * ADR-0018. Internal: the limits are a safety net, not a setting; tests use it
 * to reach the total limit without writing 256 MiB.
 *
 * @param file - Path of a `.ndjson.gz` run file.
 * @param limits - Size limits to apply.
 * @returns The header, then each result in file order.
 * @throws {@link AtiumError} as {@link readRunFileEntries} does.
 */
export async function* readRunFileEntriesWithin(
  file: string,
  limits: LineLimits,
): AsyncGenerator<RunFileEntry> {
  const source = createReadStream(file);
  const decompressed = source.pipe(createGunzip());
  // `pipe` does not forward errors: a read error reaches the loop through gunzip.
  source.once("error", (error) => decompressed.destroy(error));
  let line = 0;
  let schemas: RunFileSchemas | undefined;
  try {
    for await (const event of splitLines(decompressed, limits)) {
      line = event.number;
      const at: LineLocation = { file, line };
      const value = parseLine(at, lineText(file, event));
      if (schemas === undefined) {
        schemas = schemasOf(file, value);
        yield { kind: "header", header: validate(at, schemas.header, value) };
      } else {
        yield { kind: "result", result: validate(at, schemas.result, value), line };
      }
    }
  } catch (error) {
    throw isAtiumError(error) ? error : readError(file, line + 1, error);
  } finally {
    source.destroy();
    decompressed.destroy();
  }
  if (schemas === undefined) {
    throw new AtiumError("MODEL_INVALID", `Run file ${quoteForMessage(file)} is empty.`, {
      hint: CORRUPT_FILE_HINT,
    });
  }
}

/**
 * Reads a whole run file into a `Run`, streaming it line by line. It keeps
 * every result in memory, which for a file near the 256 MiB limit is several
 * times that size as objects: to process a large run, iterate
 * {@link readRunFileEntries} instead.
 *
 * @param file - Path of a `.ndjson.gz` run file.
 * @returns The run, equal to the one written.
 * @throws {@link AtiumError} as {@link readRunFileEntries} does.
 */
export async function readRunFile(file: string): Promise<Run> {
  let header: RunHeader | undefined;
  const results: TestResult[] = [];
  for await (const entry of readRunFileEntries(file)) {
    if (entry.kind === "header") {
      header = entry.header;
    } else {
      results.push(entry.result);
    }
  }
  if (header === undefined) {
    // `readRunFileEntries` always yields the header first or throws.
    throw new Error(`Run file ${quoteForMessage(file)} was read without a header.`);
  }
  return { ...header, results };
}

function lineText(file: string, event: LineEvent): string {
  switch (event.kind) {
    case "line":
      return event.text;
    case "exceeded":
      throw new AtiumError(
        "MODEL_INVALID",
        `Run file ${quoteForMessage(file)} goes over the ${LIMIT_NAMES[event.limit]} of ${String(event.maxBytes)} bytes at line ${String(event.number)}; it was not read.`,
        { hint: CORRUPT_FILE_HINT },
      );
    case "invalidUtf8":
      throw new AtiumError(
        "MODEL_INVALID",
        `Line ${String(event.number)} of run file ${quoteForMessage(file)} is not valid UTF-8.`,
        { hint: CORRUPT_FILE_HINT },
      );
  }
}

function parseLine({ file, line }: LineLocation, text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (error) {
    // Only the error name, and not the error as `cause`: the parser's message
    // quotes part of the line, which is untrusted content and is not redacted.
    const reason = error instanceof Error ? error.name : typeof error;
    throw new AtiumError(
      "MODEL_INVALID",
      `Line ${String(line)} of run file ${quoteForMessage(file)} is not valid JSON (${reason}).`,
      { hint: CORRUPT_FILE_HINT },
    );
  }
}

function schemasOf(file: string, header: unknown): RunFileSchemas {
  const probe = SchemaVersionProbe.safeParse(header);
  const schemas = probe.success ? RUN_FILE_SCHEMAS.get(probe.data.schemaVersion) : undefined;
  if (schemas !== undefined) {
    return schemas;
  }
  const supported = [...RUN_FILE_SCHEMAS.keys()].join(", ");
  const found = probe.success
    ? `schemaVersion ${String(probe.data.schemaVersion)}`
    : "no schemaVersion";
  throw new AtiumError(
    "MODEL_INVALID",
    `Run file ${quoteForMessage(file)} has ${found} in line 1; this version of Atium reads ${supported}.`,
    { hint: "Read the file with the version of Atium that wrote it, or update Atium." },
  );
}

function validate<T>({ file, line }: LineLocation, schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (parsed.success) {
    return parsed.data;
  }
  throw new AtiumError(
    "MODEL_INVALID",
    `Line ${String(line)} of run file ${quoteForMessage(file)} does not match the run schema (${describeIssues(parsed.error.issues)}).`,
    // Not the `ZodError` as `cause`: its message lists every issue, up to one
    // per value of a 1 MiB line, with keys taken from the file, and loggers
    // print the cause. The message above carries the bounded summary.
    { hint: CORRUPT_FILE_HINT },
  );
}

/** zlib reports damaged data with `Z_*` codes, such as `Z_DATA_ERROR` and `Z_BUF_ERROR`. */
function isZlibError(error: unknown): boolean {
  return errnoCode(error)?.startsWith("Z_") ?? false;
}

function readError(file: string, line: number, error: unknown): AtiumError {
  return isZlibError(error)
    ? new AtiumError(
        "MODEL_INVALID",
        `Run file ${quoteForMessage(file)} is not valid gzip at line ${String(line)}.`,
        { cause: error, hint: CORRUPT_FILE_HINT },
      )
    : new AtiumError("STORAGE_UNAVAILABLE", `Could not read run file ${quoteForMessage(file)}.`, {
        cause: error,
        hint: "Check that the file exists and that Atium can read it.",
      });
}
