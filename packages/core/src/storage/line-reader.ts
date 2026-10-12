import { TextDecoder } from "node:util";

// Splits a byte stream into `\n`-separated UTF-8 lines with size limits that
// are checked as bytes arrive, so an oversized line or file is rejected
// without holding it in memory (ADR-0018, "Límites del lector").

const NEWLINE = 0x0a;

/** Size limits of {@link splitLines}, in bytes. */
export interface LineLimits {
  /** Line 1, without its `\n`. */
  readonly firstLineBytes: number;
  /** Every other line, without its `\n`. */
  readonly lineBytes: number;
  /** Every byte of the stream, newlines included. */
  readonly totalBytes: number;
}

/** The limit a stream went over: line 1, another line or the whole stream. */
export type ExceededLimit = "firstLine" | "line" | "total";

/** What {@link splitLines} yields. It stops after the first `exceeded` or `invalidUtf8`. */
export type LineEvent =
  | {
      /** A complete line. */
      readonly kind: "line";
      /** Line number, from 1. */
      readonly number: number;
      /** The line without its `\n`. */
      readonly text: string;
    }
  | {
      /** The stream went over a limit while reading this line. */
      readonly kind: "exceeded";
      /** Line being read, from 1. */
      readonly number: number;
      /** Which limit. */
      readonly limit: ExceededLimit;
      /** Value of that limit, in bytes. */
      readonly maxBytes: number;
    }
  | {
      /** The line is not valid UTF-8. */
      readonly kind: "invalidUtf8";
      /** Line number, from 1. */
      readonly number: number;
    };

/** The line being read and the bytes read so far. */
interface SplitState {
  readonly limits: LineLimits;
  readonly decoder: TextDecoder;
  number: number;
  parts: Uint8Array[];
  lineBytes: number;
  totalBytes: number;
}

/**
 * Yields the lines of a byte stream, numbered from 1, decoded as strict UTF-8.
 *
 * A final line without `\n` is yielded; a final `\n` does not start an empty
 * line. Each limit is checked before the bytes that go over it are kept, so
 * memory stays within a line limit plus a chunk.
 *
 * @param chunks - Bytes, such as a decompressed file stream.
 * @param limits - Size limits.
 * @returns The lines, then at most one `exceeded` or `invalidUtf8` event.
 */
export async function* splitLines(
  chunks: AsyncIterable<Uint8Array>,
  limits: LineLimits,
): AsyncGenerator<LineEvent> {
  const state: SplitState = {
    limits,
    decoder: new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }),
    number: 1,
    parts: [],
    lineBytes: 0,
    totalBytes: 0,
  };
  for await (const chunk of chunks) {
    for (const event of splitChunk(state, chunk)) {
      yield event;
      if (event.kind !== "line") {
        return;
      }
    }
  }
  if (state.lineBytes > 0) {
    yield decodeLine(state);
  }
}

/** Yields the lines that `chunk` completes and keeps the rest in `state`. */
function* splitChunk(state: SplitState, chunk: Uint8Array): Generator<LineEvent> {
  let start = 0;
  while (start < chunk.length) {
    const newline = chunk.indexOf(NEWLINE, start);
    const end = newline === -1 ? chunk.length : newline;
    state.lineBytes += end - start;
    state.totalBytes += end - start + (newline === -1 ? 0 : 1);
    const exceeded = exceededLimit(state);
    if (exceeded !== undefined) {
      yield exceeded;
      return;
    }
    if (end > start) {
      state.parts.push(chunk.subarray(start, end));
    }
    if (newline === -1) {
      return;
    }
    yield decodeLine(state);
    state.number += 1;
    state.parts = [];
    state.lineBytes = 0;
    start = newline + 1;
  }
}

function exceededLimit(state: SplitState): LineEvent | undefined {
  const { number, limits } = state;
  const maxLineBytes = number === 1 ? limits.firstLineBytes : limits.lineBytes;
  if (state.lineBytes > maxLineBytes) {
    const limit = number === 1 ? "firstLine" : "line";
    return { kind: "exceeded", number, limit, maxBytes: maxLineBytes };
  }
  if (state.totalBytes > limits.totalBytes) {
    return { kind: "exceeded", number, limit: "total", maxBytes: limits.totalBytes };
  }
  return undefined;
}

function decodeLine(state: SplitState): LineEvent {
  try {
    const text = state.decoder.decode(concat(state.parts, state.lineBytes));
    return { kind: "line", number: state.number, text };
  } catch (error) {
    // A fatal `TextDecoder` throws `TypeError` on malformed UTF-8.
    if (error instanceof TypeError) {
      return { kind: "invalidUtf8", number: state.number };
    }
    throw error;
  }
}

function concat(parts: readonly Uint8Array[], length: number): Uint8Array {
  const [only] = parts;
  if (parts.length === 1 && only !== undefined) {
    return only;
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }
  return bytes;
}
