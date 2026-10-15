import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { AtiumError } from "./errors.js";
import { failOpen } from "./fail-open.js";
import type { LogStream, StderrLoggerOptions } from "./stderr-logger.js";
import { createStderrLogger } from "./stderr-logger.js";
import { createRedactor, RedactConfigSchema } from "./redact/redactor.js";
import { HEAVY_TEST_TIMEOUT_MS } from "./testing/timeouts.js";

const ANSI_ESCAPE = "\u001b[";
const SECRET_HEADER = "Authorization: Bearer abc.def";
const REDACTED_HEADER = "Authorization: Bearer [REDACTED]";

const redactor = createRedactor(RedactConfigSchema.parse({}));

interface FakeStream extends LogStream {
  readonly chunks: string[];
}

/** Stream that keeps every chunk written to it. */
function fakeStream(isTTY = false): FakeStream {
  const chunks: string[] = [];
  return {
    chunks,
    isTTY,
    write: (chunk: string) => {
      chunks.push(chunk);
      return true;
    },
  };
}

function loggerFor(
  stream: LogStream,
  overrides: Partial<Omit<StderrLoggerOptions, "stream">> = {},
): ReturnType<typeof createStderrLogger> {
  return createStderrLogger({ stream, env: {}, redactor, namespace: "atium:cli", ...overrides });
}

describe("createStderrLogger", () => {
  describe("levels", () => {
    it("writes error, warn and info entries but not debug ones by default", () => {
      const stream = fakeStream();
      const logger = loggerFor(stream);

      logger.error("Write failed");
      logger.warn("Sync skipped");
      logger.info("Run uploaded");
      logger.debug("Cache hit");

      expect(stream.chunks).toEqual([
        "atium:cli error Write failed\n",
        "atium:cli warn Sync skipped\n",
        "atium:cli info Run uploaded\n",
      ]);
    });

    it("writes debug entries when verbose", () => {
      const stream = fakeStream();

      loggerFor(stream, { verbose: true }).debug("Cache hit");

      expect(stream.chunks).toEqual(["atium:cli debug Cache hit\n"]);
    });

    it.each(["atium:*", "*", "other,atium:cli"])("writes debug entries with DEBUG=%s", (debug) => {
      const stream = fakeStream();

      loggerFor(stream, { env: { DEBUG: debug } }).debug("Cache hit");

      expect(stream.chunks).toEqual(["atium:cli debug Cache hit\n"]);
    });

    it.each(["other:*", "atium:*,-atium:cli", "", "atium"])(
      "skips debug entries with DEBUG=%s",
      (debug) => {
        const stream = fakeStream();

        loggerFor(stream, { env: { DEBUG: debug } }).debug("Cache hit");

        expect(stream.chunks).toEqual([]);
      },
    );

    function levelsWrittenWith(
      overrides: Partial<Omit<StderrLoggerOptions, "stream">>,
    ): readonly string[] {
      const stream = fakeStream();
      const logger = loggerFor(stream, overrides);
      logger.error("e");
      logger.warn("w");
      logger.info("i");
      logger.debug("d");
      return stream.chunks.map((chunk) => chunk.split(" ")[1] ?? "");
    }

    it.each([
      ["error", ["error"]],
      ["warn", ["error", "warn"]],
      ["info", ["error", "warn", "info"]],
      ["debug", ["error", "warn", "info", "debug"]],
    ] as const)("writes down to level %s", (level, expected) => {
      expect(levelsWrittenWith({ level })).toEqual(expected);
    });

    it("writes debug entries when DEBUG enables them, whatever the level", () => {
      expect(levelsWrittenWith({ level: "error", env: { DEBUG: "atium:*" } })).toEqual([
        "error",
        "debug",
      ]);
      expect(levelsWrittenWith({ level: "warn", verbose: true })).toEqual([
        "error",
        "warn",
        "debug",
      ]);
    });

    it("includes error stacks at level debug", () => {
      const stream = fakeStream();

      loggerFor(stream, { level: "debug" }).error("Write failed", { error: new Error("boom") });

      expect(stream.chunks[0]).toContain('"stack":"Error: boom');
    });
  });

  describe("context", () => {
    it("appends the context as JSON on the same line", () => {
      const stream = fakeStream();

      loggerFor(stream).info("Run uploaded", { runId: "r1", durationMs: 42, tags: ["@smoke"] });

      expect(stream.chunks).toEqual([
        'atium:cli info Run uploaded {"runId":"r1","durationMs":42,"tags":["@smoke"]}\n',
      ]);
    });

    it("serializes an error with its code, hint and cause, without the stack", () => {
      const stream = fakeStream();
      const error = new AtiumError("STORAGE_UNAVAILABLE", "Could not open the database.", {
        cause: new Error("EACCES"),
        hint: "Check the permissions of .atium/.",
      });

      loggerFor(stream).warn("Storage failed", { error });

      expect(stream.chunks).toEqual([
        "atium:cli warn Storage failed " +
          JSON.stringify({
            error: {
              name: "AtiumError",
              message: "Could not open the database.",
              code: "STORAGE_UNAVAILABLE",
              hint: "Check the permissions of .atium/.",
              cause: { name: "Error", message: "EACCES" },
            },
          }) +
          "\n",
      ]);
    });

    it("includes error stacks when debug is enabled", () => {
      const stream = fakeStream();
      const error = new Error("boom");

      loggerFor(stream, { verbose: true }).warn("Failed", { error });

      expect(stream.chunks[0]).toContain(JSON.stringify(error.stack));
    });
  });

  describe("redaction", () => {
    it("redacts secrets in the message", () => {
      const stream = fakeStream();

      loggerFor(stream).info(`Request sent with ${SECRET_HEADER}`);

      expect(stream.chunks).toEqual([`atium:cli info Request sent with ${REDACTED_HEADER}\n`]);
    });

    it("redacts sensitive fields and secrets in the context", () => {
      const stream = fakeStream();

      loggerFor(stream).info("Login", { password: "hunter2", note: SECRET_HEADER });

      expect(stream.chunks).toEqual([
        `atium:cli info Login {"password":"[REDACTED]","note":"${REDACTED_HEADER}"}\n`,
      ]);
    });

    it("redacts secrets in error messages and stacks", () => {
      const stream = fakeStream();

      loggerFor(stream, { verbose: true }).error("Failed", { error: new Error(SECRET_HEADER) });

      const [line = ""] = stream.chunks;
      expect(line).toContain(REDACTED_HEADER);
      expect(line).not.toContain("abc.def");
    });
  });

  describe("colors", () => {
    it("colors the level when the stream is a terminal", () => {
      const stream = fakeStream(true);

      loggerFor(stream).warn("Sync skipped");

      expect(stream.chunks[0]).toContain(ANSI_ESCAPE);
    });

    it("treats an empty NO_COLOR as unset", () => {
      const stream = fakeStream(true);

      loggerFor(stream, { env: { NO_COLOR: "" } }).warn("Sync skipped");

      expect(stream.chunks[0]).toContain(ANSI_ESCAPE);
    });

    it("writes no color codes with NO_COLOR, even on a terminal", () => {
      const stream = fakeStream(true);
      const logger = loggerFor(stream, { env: { NO_COLOR: "1" }, verbose: true });

      logger.error("a");
      logger.warn("b");
      logger.info("c");
      logger.debug("d");

      expect(stream.chunks).toHaveLength(4);
      expect(stream.chunks.join("")).not.toContain(ANSI_ESCAPE);
    });

    it("writes no color codes when the stream is not a terminal", () => {
      const stream = fakeStream(false);

      loggerFor(stream).error("Write failed");

      expect(stream.chunks[0]).not.toContain(ANSI_ESCAPE);
    });
  });

  describe("never throwing", () => {
    it("drops the entry when the stream throws", () => {
      const stream: LogStream = {
        write: () => {
          throw new Error("EPIPE");
        },
      };

      expect(() => {
        loggerFor(stream).error("Write failed", { path: "a.ndjson" });
      }).not.toThrow();
    });

    it("escapes line breaks in the message, so an entry cannot forge another", () => {
      const stream = fakeStream();

      loggerFor(stream).info("first\r\natium:cli error forged");

      expect(stream.chunks).toEqual(["atium:cli info first\\r\\natium:cli error forged\n"]);
    });

    it.each([
      ["an ANSI escape", "\u001b[2J", "\\u001b[2J"],
      ["a C1 control", "\u009b31m", "\\u009b31m"],
      ["a line separator", "a\u2028b", "a\\u2028b"],
      ["a tab, which is kept", "a\tb", "a\tb"],
    ])("escapes %s in the message", (_label, message, written) => {
      const stream = fakeStream();

      loggerFor(stream).info(message);

      expect(stream.chunks).toEqual([`atium:cli info ${written}\n`]);
    });

    it("writes a marker when the message is not a string", () => {
      const stream = fakeStream();
      const message: unknown = Symbol("not a message");

      // Callers from plain JavaScript can pass anything.
      loggerFor(stream).info(message as string);

      expect(stream.chunks).toEqual(["atium:cli info [unformattable log entry]\n"]);
    });

    const revoked = Proxy.revocable({}, {});
    revoked.revoke();
    let deep: unknown = [];
    for (let level = 0; level < 100_000; level += 1) {
      deep = [deep];
    }

    it.each([
      [
        "a getter that throws",
        {
          get broken(): string {
            throw new Error("getter failed");
          },
        },
      ],
      [
        "a toJSON that throws",
        {
          value: {
            toJSON: () => {
              throw new Error("toJSON failed");
            },
          },
        },
      ],
      ["a revoked proxy", { value: revoked.proxy }],
      ["nesting deeper than the stack", { deep }],
    ])("writes the marker instead of %s in the context", (_label, context) => {
      const stream = fakeStream();

      loggerFor(stream).info("Run uploaded", context);

      expect(stream.chunks).toEqual(['atium:cli info Run uploaded "[unserializable context]"\n']);
    });

    it("writes a marker when the redactor throws", () => {
      const stream = fakeStream();
      const throwing = (): never => {
        throw new Error("redactor failed");
      };
      const logger = loggerFor(stream, {
        redactor: { redact: throwing, redactHeaders: throwing, redactFields: throwing },
      });

      logger.info("Run uploaded", { runId: "r1" });

      expect(stream.chunks).toEqual(["atium:cli info [unformattable log entry]\n"]);
    });

    // Slow next to the rest of the suite: room on a loaded CI runner (#99).
    it(
      "writes exactly one line for any message and context",
      () => {
        fc.assert(
          fc.property(
            fc.string({ unit: "binary" }),
            fc.dictionary(fc.string(), fc.anything({ withBigInt: true, withDate: true })),
            (message, context) => {
              const stream = fakeStream();

              loggerFor(stream, { verbose: true }).warn(message, context);

              expect(stream.chunks).toHaveLength(1);
              expect(stream.chunks[0]?.match(/\n/g)).toEqual(["\n"]);
              expect(stream.chunks[0]?.endsWith("\n")).toBe(true);
              expect(stream.chunks[0]).not.toContain("\u001b");
            },
          ),
          // Fixed seed, so a failure reproduces (04-testing.md, "Determinismo").
          { seed: 20261012, numRuns: 300 },
        );
      },
      HEAVY_TEST_TIMEOUT_MS,
    );

    it("lets failOpen report a failure through it", async () => {
      const stream = fakeStream();
      const logger = loggerFor(stream);

      const value = await failOpen({ label: "history sync", fallback: [], logger }, () =>
        Promise.reject(new Error(`401 with ${SECRET_HEADER}`)),
      );

      expect(value).toEqual([]);
      expect(stream.chunks).toEqual([
        "atium:cli warn history sync failed; continuing without it " +
          `{"error":{"name":"Error","message":"401 with ${REDACTED_HEADER}"}}\n`,
      ]);
    });
  });
});
