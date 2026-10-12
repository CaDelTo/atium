import { describe, expect, it } from "vitest";
import type { LineEvent, LineLimits } from "./line-reader.js";
import { splitLines } from "./line-reader.js";

const WIDE_LIMITS: LineLimits = { firstLineBytes: 100, lineBytes: 100, totalBytes: 1000 };

async function* chunksOf(...parts: readonly (string | Uint8Array)[]): AsyncGenerator<Uint8Array> {
  for (const part of parts) {
    yield typeof part === "string" ? Buffer.from(part, "utf8") : part;
  }
  await Promise.resolve();
}

async function collect(
  chunks: AsyncIterable<Uint8Array>,
  limits: LineLimits = WIDE_LIMITS,
): Promise<LineEvent[]> {
  const events: LineEvent[] = [];
  for await (const event of splitLines(chunks, limits)) {
    events.push(event);
  }
  return events;
}

function lines(...texts: readonly string[]): LineEvent[] {
  return texts.map((text, index) => ({ kind: "line", number: index + 1, text }));
}

/** Endless chunks of `chunk`, counting how many were read. */
function endless(chunk: string): { chunks: AsyncIterable<Uint8Array>; read: () => number } {
  let read = 0;
  const bytes = Buffer.from(chunk, "utf8");
  return {
    chunks: {
      async *[Symbol.asyncIterator]() {
        for (;;) {
          read += 1;
          yield bytes;
          await Promise.resolve();
        }
      },
    },
    read: () => read,
  };
}

describe("splitLines", () => {
  it("numbers lines from 1 and joins lines split across chunks", async () => {
    expect(await collect(chunksOf('{"a"', ":1}\n{", '"b":2}\n'))).toEqual(
      lines('{"a":1}', '{"b":2}'),
    );
  });

  it("yields a last line without a newline, and no empty line after a final newline", async () => {
    expect(await collect(chunksOf("one\ntwo"))).toEqual(lines("one", "two"));
    expect(await collect(chunksOf("one\n"))).toEqual(lines("one"));
    expect(await collect(chunksOf())).toEqual([]);
  });

  it("yields empty lines in the middle, so the reader can reject them", async () => {
    expect(await collect(chunksOf("one\n\ntwo\n"))).toEqual(lines("one", "", "two"));
  });

  it("decodes a multibyte character split across chunks", async () => {
    const euro = Buffer.from("€", "utf8");

    expect(await collect(chunksOf(euro.subarray(0, 1), euro.subarray(1), "\n"))).toEqual(
      lines("€"),
    );
  });

  it("stops at a line that is not valid UTF-8, with its number", async () => {
    const invalid = Uint8Array.from([0x22, 0xff, 0x22, 0x0a]);

    expect(await collect(chunksOf("ok\n", invalid, "never\n"))).toEqual([
      ...lines("ok"),
      { kind: "invalidUtf8", number: 2 },
    ]);
  });

  it("accepts lines at their limit, without counting the newline", async () => {
    const limits = { firstLineBytes: 3, lineBytes: 2, totalBytes: 9 };

    expect(await collect(chunksOf("abc\nde\nfg"), limits)).toEqual(lines("abc", "de", "fg"));
  });

  it.each([
    {
      limit: "firstLine",
      input: "abcd\nok\n",
      expected: { kind: "exceeded", number: 1, limit: "firstLine", maxBytes: 3 },
    },
    {
      limit: "line",
      input: "abc\nok\nabc\n",
      expected: { kind: "exceeded", number: 3, limit: "line", maxBytes: 2 },
    },
    {
      limit: "total",
      input: "abc\nde\nfg\nhi\n",
      expected: { kind: "exceeded", number: 3, limit: "total", maxBytes: 9 },
    },
  ])(
    "stops when the $limit limit is exceeded, with the line number",
    async ({ input, expected }) => {
      const limits = { firstLineBytes: 3, lineBytes: 2, totalBytes: 9 };

      const events = await collect(chunksOf(input), limits);

      expect(events.at(-1)).toEqual(expected);
      expect(events.filter((event) => event.kind !== "line")).toHaveLength(1);
    },
  );

  it("rejects an endless line without reading much more than its limit", async () => {
    const source = endless("x".repeat(1024));

    const events = await collect(source.chunks, {
      firstLineBytes: 10_000,
      lineBytes: 10_000,
      totalBytes: 1_000_000,
    });

    expect(events).toEqual([{ kind: "exceeded", number: 1, limit: "firstLine", maxBytes: 10_000 }]);
    expect(source.read()).toBe(10);
  });

  it("rejects an endless stream of short lines at the total limit", async () => {
    const source = endless("{}\n");

    const events = await collect(source.chunks, {
      firstLineBytes: 10,
      lineBytes: 10,
      totalBytes: 30,
    });

    expect(events.at(-1)).toEqual({ kind: "exceeded", number: 11, limit: "total", maxBytes: 30 });
    expect(source.read()).toBe(11);
  });
});
