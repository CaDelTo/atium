import { mkdtemp, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RUN_FILE_LINE_TARGET_BYTES, RUN_FILE_READ_LIMITS, RUNS_DIRECTORY } from "../defaults.js";
import type { Run } from "../model/run.js";
import type { TestId } from "../model/ids.js";
import { aRun, aTestResult, FakeLogger, rejectedAtiumError } from "../testing/index.js";
import { readRunFile, readRunFileEntries, readRunFileEntriesWithin } from "./run-file-reader.js";
import { runFilePath, writeRunFile, writeRunFileWith } from "./run-file-writer.js";
import type { WriteRunFileOptions } from "./run-file-writer.js";
import {
  defaultError,
  HEAVY_TEST_TIMEOUT_MS,
  maxedResult,
  resultWithAttempt,
} from "./samples.test-support.js";

let rootDir: string;

beforeEach(async () => {
  rootDir = await mkdtemp(path.join(tmpdir(), "atium-run-file-"));
});

afterEach(async () => {
  await rm(rootDir, { recursive: true, force: true });
});

function writeOptions(logger = new FakeLogger()): WriteRunFileOptions {
  return { rootDir, logger };
}

/** A run with a result of each outcome and every optional header field set. */
function sampleRun(): Run {
  return aRun()
    .with({
      ci: { provider: "github", runId: "42", runAttempt: 2, shard: { index: 1, total: 2 } },
      frameworkConfig: { retries: 2, workers: 4, projects: ["chromium", "firefox"] },
    })
    .withResult(aTestResult("passes").passed())
    .withResult(aTestResult("flakes").failedThenPassed())
    .withResult(aTestResult("fails").failedAllAttempts(3))
    .build();
}

/** The decompressed lines of a run file, without the final empty string. */
async function linesOf(file: string): Promise<string[]> {
  const text = gunzipSync(await readFile(file)).toString("utf8");
  expect(text.endsWith("\n")).toBe(true);
  return text.slice(0, -1).split("\n");
}

async function writeGzip(name: string, content: string | Buffer): Promise<string> {
  const file = path.join(rootDir, name);
  await writeFile(file, gzipSync(content));
  return file;
}

/** The header of `sampleRun()` as line 1 of a file. */
function headerLine(patch: Record<string, unknown> = {}): string {
  const { results, ...header } = sampleRun();
  expect(results).not.toHaveLength(0);
  return JSON.stringify({ ...header, ...patch });
}

/** A valid endpoint of a network summary. */
function endpointLike(): Record<string, unknown> {
  return {
    method: "GET",
    urlTemplate: "/api",
    count: 1,
    statuses: { "200": 1 },
    failures: 0,
    p95Ms: 1,
  };
}

function resultLine(): string {
  return JSON.stringify(aTestResult("one").build());
}

describe("writeRunFile and readRunFile", () => {
  it("read back the same run that was built", async () => {
    const run = sampleRun();

    const file = await writeRunFile(run, writeOptions());

    expect(await readRunFile(file)).toEqual(run);
  });

  it("write to .atium/runs/<runId>.ndjson.gz under the root and return its path", async () => {
    const run = sampleRun();

    const file = await writeRunFile(run, writeOptions());

    expect(file).toBe(path.join(rootDir, RUNS_DIRECTORY, `${run.id}.ndjson.gz`));
    expect(runFilePath(rootDir, run.id)).toBe(file);
  });

  it("write the header without results on line 1 and one result per line, in order", async () => {
    const run = sampleRun();

    const lines = await linesOf(await writeRunFile(run, writeOptions()));

    const { results, ...header } = run;
    expect(lines).toHaveLength(1 + results.length);
    expect(JSON.parse(lines[0] ?? "")).toEqual(header);
    expect(lines.slice(1).map((line) => JSON.parse(line) as unknown)).toEqual(results);
  });

  it("write a run without results as its header alone", async () => {
    const run = aRun().build();

    const file = await writeRunFile(run, writeOptions());

    expect(await linesOf(file)).toHaveLength(1);
    expect(await readRunFile(file)).toEqual(run);
  });

  it("write a run over the caps capped, and read it back without errors", async () => {
    const pageErrors = Array.from(
      { length: 30 },
      (_, index) => `\u001b[31merror ${String(index)}\u001b[0m`,
    );
    const over = resultWithAttempt({
      error: { ...defaultError(), message: "\u001b[1mboom\u001b[22m" },
      pageErrors,
    });
    const run = { ...aRun().build(), results: [over] };

    const read = await readRunFile(await writeRunFile(run, writeOptions()));

    expect(read.results[0]?.attempts[0]?.error?.message).toBe("boom");
    expect(read.results[0]?.attempts[0]?.pageErrors?.[0]).toBe("error 10");
    expect(read.results[0]?.attempts[0]?.pageErrorsDropped).toBe(10);
  });

  it(
    "write 10 failed attempts with every field at its cap in a line under 768 KiB, marked detailTruncated",
    async () => {
      const result = maxedResult({ attempts: 10 });
      const run = { ...aRun().build(), results: [result] };

      const file = await writeRunFile(run, writeOptions());

      const [, line] = await linesOf(file);
      expect(Buffer.byteLength(line ?? "", "utf8")).toBeLessThan(RUN_FILE_LINE_TARGET_BYTES);
      const read = await readRunFile(file);
      expect(read.results[0]?.detailTruncated).toBe(true);
      expect(read.results[0]?.test.testId).toBe(result.test.testId);
    },
    HEAVY_TEST_TIMEOUT_MS,
  );

  it(
    "write a result with every field over its cap under 768 KiB and read it back",
    async () => {
      const result = maxedResult({ attempts: 25, steps: 250, tags: 60, titleLevels: 25 });
      const run = { ...aRun().build(), results: [result] };

      const file = await writeRunFile(run, writeOptions());

      const [, line] = await linesOf(file);
      expect(Buffer.byteLength(line ?? "", "utf8")).toBeLessThan(RUN_FILE_LINE_TARGET_BYTES);
      const [read] = (await readRunFile(file)).results;
      expect(read?.detailTruncated).toBe(true);
      expect(read?.test.testId).toBe(result.test.testId);
      expect(read?.attempts.map((attempt) => attempt.index)).toEqual([
        0,
        ...Array.from({ length: 19 }, (_, offset) => 6 + offset),
      ]);
      expect(read?.attemptsDropped).toBe(5);
      expect(read?.bdd?.steps).toHaveLength(21);
      expect(read?.bdd?.stepsDropped).toBe(50);
    },
    HEAVY_TEST_TIMEOUT_MS,
  );

  // POSIX permissions; Windows ignores the mode.
  it.skipIf(process.platform === "win32")("write the file readable only by its owner", async () => {
    const file = await writeRunFile(sampleRun(), writeOptions());

    expect((await stat(file)).mode & 0o777).toBe(0o600);
  });

  it("never replace an existing run file, and leave no temporary files", async () => {
    const run = sampleRun();
    const file = await writeRunFile(run, writeOptions());
    const before = await readFile(file);

    const error = await rejectedAtiumError(writeRunFile({ ...run, results: [] }, writeOptions()));

    expect(error.code).toBe("STORAGE_CONFLICT");
    expect(await readFile(file)).toEqual(before);
    expect(await readdir(path.dirname(file))).toEqual([path.basename(file)]);
  });

  it("reject a run that is invalid even after the caps, without leaving any file", async () => {
    const valid = aTestResult("bad id").build();
    const invalid = { ...valid, test: { ...valid.test, testId: "not-an-id" as TestId } };
    const run = { ...aRun().build(), results: [aTestResult("ok").build(), invalid] };

    const error = await rejectedAtiumError(writeRunFile(run, writeOptions()));

    expect(error.code).toBe("MODEL_INVALID");
    expect(error.message).toContain("Result 1");
    expect(error.message).toContain("test.testId");
    expect(await readdir(path.join(rootDir, RUNS_DIRECTORY))).toEqual([]);
  });

  it("reject a header with an invalid run id before touching the disk", async () => {
    const run = { ...aRun().build(), id: "../escape" as Run["id"] };

    const error = await rejectedAtiumError(writeRunFile(run, writeOptions()));

    expect(error.code).toBe("MODEL_INVALID");
    expect(error.message).toContain("run header");
    expect(await readdir(rootDir)).toEqual([]);
  });

  it("report a directory that cannot be created as unavailable storage", async () => {
    const blocker = path.join(rootDir, "file");
    await writeFile(blocker, "not a directory");

    const error = await rejectedAtiumError(
      writeRunFile(sampleRun(), { ...writeOptions(), rootDir: blocker }),
    );

    expect(error.code).toBe("STORAGE_UNAVAILABLE");
    expect(error.cause).toBeDefined();
  });

  it("still returns the file when the temporary directory cannot be removed, with a warning", async () => {
    const logger = new FakeLogger();
    const run = sampleRun();

    const file = await writeRunFileWith(run, writeOptions(logger), () =>
      Promise.reject(new Error("EBUSY: resource busy or locked")),
    );

    expect(await readRunFile(file)).toEqual(run);
    expect(logger.entries.map((entry) => entry.level)).toEqual(["warn"]);
    expect(logger.entries[0]?.message).toContain("temporary directory");
  });

  it("keeps the original error when the temporary directory cannot be removed either", async () => {
    const valid = aTestResult("bad id").build();
    const invalid = { ...valid, test: { ...valid.test, testId: "not-an-id" as TestId } };
    const run = { ...aRun().build(), results: [invalid] };

    const error = await rejectedAtiumError(
      writeRunFileWith(run, writeOptions(), () => Promise.reject(new Error("EBUSY"))),
    );

    expect(error.code).toBe("MODEL_INVALID");
  });
});

describe("readRunFileEntries", () => {
  it("yields the header first and then each result with its line number", async () => {
    const run = sampleRun();
    const file = await writeRunFile(run, writeOptions());

    const entries = [];
    for await (const entry of readRunFileEntries(file)) {
      entries.push(entry);
    }

    const { results, ...header } = run;
    expect(entries).toEqual([
      { kind: "header", header },
      ...results.map((result, index) => ({ kind: "result", result, line: index + 2 })),
    ]);
  });

  // `/dev/fd` lists the open file descriptors of the process on Linux and macOS.
  it.skipIf(process.platform === "win32")("closes the file when the loop stops early", async () => {
    const file = await writeRunFile(sampleRun(), writeOptions());
    const openBefore = (await readdir("/dev/fd")).length;

    for await (const entry of readRunFileEntries(file)) {
      expect(entry.kind).toBe("header");
      break;
    }

    // Closing a file descriptor completes asynchronously after `destroy()`.
    await vi.waitFor(async () => {
      expect((await readdir("/dev/fd")).length).toBeLessThanOrEqual(openBefore);
    });
  });

  it("can stop after the header", async () => {
    const run = sampleRun();
    const file = await writeRunFile(run, writeOptions());

    let header: unknown;
    for await (const entry of readRunFileEntries(file)) {
      header = entry.kind === "header" ? entry.header : undefined;
      break;
    }

    const { results, ...expected } = run;
    expect(results).not.toHaveLength(0);
    expect(header).toEqual(expected);
  });

  it("rejects a file over the total limit with the limit and the line number", async () => {
    const file = await writeGzip(
      "total.ndjson.gz",
      `${headerLine()}\n${resultLine()}\n${resultLine()}\n`,
    );
    const headerBytes = Buffer.byteLength(headerLine(), "utf8");

    const error = await rejectedAtiumError(
      (async () => {
        for await (const entry of readRunFileEntriesWithin(file, {
          firstLineBytes: RUN_FILE_READ_LIMITS.headerBytes,
          lineBytes: RUN_FILE_READ_LIMITS.resultLineBytes,
          totalBytes: headerBytes + 1 + Buffer.byteLength(resultLine(), "utf8") + 10,
        })) {
          expect(entry).toBeDefined();
        }
      })(),
    );

    expect(error.code).toBe("MODEL_INVALID");
    expect(error.message).toContain("total size limit");
    expect(error.message).toContain("line 3");
  });
});

describe("readRunFile errors", () => {
  it("rejects a header line over 64 KiB", async () => {
    const file = await writeGzip(
      "header.ndjson.gz",
      `${"x".repeat(RUN_FILE_READ_LIMITS.headerBytes + 1)}\n`,
    );

    const error = await rejectedAtiumError(readRunFile(file));

    expect(error.code).toBe("MODEL_INVALID");
    expect(error.message).toContain(
      `header line limit of ${String(RUN_FILE_READ_LIMITS.headerBytes)} bytes at line 1`,
    );
  });

  it(
    "rejects a gzip bomb at the 1 MiB line limit without inflating it all",
    async () => {
      // 64 MiB of one line compress to about 64 KiB.
      const bomb = Buffer.concat([
        Buffer.from(`${headerLine()}\n`, "utf8"),
        Buffer.alloc(64 * 1024 * 1024, "x"),
      ]);
      const file = await writeGzip("bomb.ndjson.gz", bomb);

      const error = await rejectedAtiumError(readRunFile(file));

      expect(error.code).toBe("MODEL_INVALID");
      expect(error.message).toContain(
        `result line limit of ${String(RUN_FILE_READ_LIMITS.resultLineBytes)} bytes at line 2`,
      );
    },
    HEAVY_TEST_TIMEOUT_MS,
  );

  it.each([
    {
      what: "is not valid JSON",
      content: () => `${headerLine()}\n${resultLine()}\n{oops\n`,
      message: "Line 3",
    },
    {
      what: "has an empty line",
      content: () => `${headerLine()}\n\n${resultLine()}\n`,
      message: "Line 2",
    },
    {
      what: "does not match the schema",
      content: () => `${headerLine()}\n${JSON.stringify({ outcome: "passed" })}\n`,
      message: "Line 2",
    },
    {
      what: "has results in the header",
      content: () => `${headerLine({ results: [] })}\n`,
      message: "Line 1",
    },
  ])("rejects a line that $what, with its number", async ({ content, message }) => {
    const file = await writeGzip("invalid.ndjson.gz", content());

    const error = await rejectedAtiumError(readRunFile(file));

    expect(error.code).toBe("MODEL_INVALID");
    expect(error.message).toContain(message);
    expect(error.hint).toBeDefined();
  });

  it("quotes and caps file content in the message, and does not attach it as the cause", async () => {
    const result = aTestResult("one").failedThenPassed().build();
    const injected = `${"k".repeat(100_000)}\nERROR forged log line`;
    const [first, ...rest] = result.attempts;
    const line = JSON.stringify({
      ...result,
      attempts: [
        { ...first, network: { endpoints: [{ ...endpointLike(), statuses: { [injected]: 1 } }] } },
        ...rest,
      ],
    });
    const file = await writeGzip("injected.ndjson.gz", `${headerLine()}\n${line}\n`);

    const error = await rejectedAtiumError(readRunFile(file));

    expect(error.message).toContain("Line 2");
    expect(error.message).not.toContain("\n");
    expect(error.message.length).toBeLessThan(2000);
    expect(error.cause).toBeUndefined();
  });

  it("lists the first 5 issues of a line and counts the rest", async () => {
    const line = JSON.stringify({ ...aTestResult("one").build(), test: {}, attempts: [{}] });
    const file = await writeGzip("issues.ndjson.gz", `${headerLine()}\n${line}\n`);

    const error = await rejectedAtiumError(readRunFile(file));

    expect(error.message).toMatch(/; and \d+ more\)\.$/);
  });

  it("does not quote the invalid JSON in the message or the cause", async () => {
    const file = await writeGzip("secret.ndjson.gz", `${headerLine()}\n{"token": sk-live-123\n`);

    const error = await rejectedAtiumError(readRunFile(file));

    expect(error.message).toContain("SyntaxError");
    expect(error.message).not.toContain("sk-live");
    expect(error.cause).toBeUndefined();
  });

  it("rejects invalid UTF-8 with the line number", async () => {
    const content = Buffer.concat([
      Buffer.from(`${headerLine()}\n"`, "utf8"),
      Buffer.from([0xc3, 0x28]),
      Buffer.from('"\n', "utf8"),
    ]);
    const file = await writeGzip("utf8.ndjson.gz", content);

    const error = await rejectedAtiumError(readRunFile(file));

    expect(error.message).toContain("Line 2");
    expect(error.message).toContain("UTF-8");
  });

  it.each([
    { what: "a schemaVersion it does not read", version: 2, expected: "schemaVersion 2" },
    { what: "no schemaVersion", version: undefined, expected: "no schemaVersion" },
  ])("rejects a header with $what", async ({ version, expected }) => {
    const file = await writeGzip(
      "version.ndjson.gz",
      `${headerLine({ schemaVersion: version })}\n`,
    );

    const error = await rejectedAtiumError(readRunFile(file));

    expect(error.code).toBe("MODEL_INVALID");
    expect(error.message).toContain(expected);
    expect(error.message).toContain("reads 1");
  });

  it("rejects an empty file", async () => {
    const file = await writeGzip("empty.ndjson.gz", "");

    const error = await rejectedAtiumError(readRunFile(file));

    expect(error.code).toBe("MODEL_INVALID");
    expect(error.message).toContain("is empty");
  });

  it.each([
    { what: "is not gzip", content: () => Buffer.from("plain text\n", "utf8") },
    {
      what: "is a truncated gzip",
      content: () => gzipSync(`${headerLine()}\n${resultLine()}\n`).subarray(0, 40),
    },
  ])("rejects a file that $what as invalid", async ({ content }) => {
    const file = path.join(rootDir, "broken.ndjson.gz");
    await writeFile(file, content());

    const error = await rejectedAtiumError(readRunFile(file));

    expect(error.code).toBe("MODEL_INVALID");
    expect(error.message).toContain("not valid gzip");
  });

  it("reports a missing file as unavailable storage", async () => {
    const error = await rejectedAtiumError(readRunFile(path.join(rootDir, "missing.ndjson.gz")));

    expect(error.code).toBe("STORAGE_UNAVAILABLE");
    expect(error.cause).toBeDefined();
  });
});
