const QUOTE = 0x22;
const BACKSLASH = 0x5c;
const FIRST_PRINTABLE = 0x20;
const FIRST_NON_ASCII = 0x80;
const FIRST_THREE_BYTE = 0x800;

/** Control characters that JSON escapes with two bytes: `\b`, `\t`, `\n`, `\f`, `\r`. */
const SHORT_CONTROL_ESCAPES: ReadonlySet<number> = new Set([0x08, 0x09, 0x0a, 0x0c, 0x0d]);

/** Escaped size of a surrogate pair: the 4 UTF-8 bytes of its code point. Nothing else has this size. */
const SURROGATE_PAIR_BYTES = 4;

/** Escaped size of a character written as `\uXXXX`. */
const UNICODE_ESCAPE_BYTES = 6;

function isHighSurrogate(unit: number): boolean {
  return unit >= 0xd800 && unit <= 0xdbff;
}

function isLowSurrogate(unit: number): boolean {
  return unit >= 0xdc00 && unit <= 0xdfff;
}

/**
 * Escaped size, in UTF-8 bytes, of the character that starts at `index`. A
 * surrogate pair is one character; a lone surrogate is written as `\uXXXX`, as
 * `JSON.stringify` does.
 */
function escapedSizeAt(value: string, index: number): number {
  const unit = value.charCodeAt(index);
  if (unit === QUOTE || unit === BACKSLASH) {
    return 2;
  }
  if (unit < FIRST_PRINTABLE) {
    return SHORT_CONTROL_ESCAPES.has(unit) ? 2 : UNICODE_ESCAPE_BYTES;
  }
  if (unit < FIRST_NON_ASCII) {
    return 1;
  }
  if (unit < FIRST_THREE_BYTE) {
    return 2;
  }
  if (isHighSurrogate(unit)) {
    return isLowSurrogate(value.charCodeAt(index + 1))
      ? SURROGATE_PAIR_BYTES
      : UNICODE_ESCAPE_BYTES;
  }
  return isLowSurrogate(unit) ? UNICODE_ESCAPE_BYTES : 3;
}

/** Number of UTF-16 code units taken by a character of the given escaped size. */
function unitsOf(escapedSize: number): number {
  return escapedSize === SURROGATE_PAIR_BYTES ? 2 : 1;
}

/**
 * Size of `value` once escaped as a JSON string, in UTF-8 bytes and without
 * the surrounding quotes. This is the measure of every text cap of the model
 * (ADR-0018).
 *
 * Equals `Buffer.byteLength(JSON.stringify(value)) - 2` without building the
 * escaped string.
 *
 * @param value - Text to measure.
 * @returns Size in bytes.
 */
export function jsonEscapedByteLength(value: string): number {
  let bytes = 0;
  let index = 0;
  while (index < value.length) {
    const size = escapedSizeAt(value, index);
    bytes += size;
    index += unitsOf(size);
  }
  return bytes;
}

/**
 * Returns the longest prefix of `value` that fits in `maxBytes` once escaped
 * for JSON, measured as {@link jsonEscapedByteLength} does.
 *
 * Producers call it before validating, so text fields stay within the caps of
 * ADR-0018. It never splits a multibyte character, a surrogate pair or an
 * escape sequence, so the result may be a few bytes under the cap. It adds no
 * ellipsis or marker.
 *
 * @param value - Text to truncate.
 * @param maxBytes - Cap in bytes. A non-negative integer.
 * @returns `value` itself when it fits.
 * @throws RangeError if `maxBytes` is not a non-negative safe integer.
 *
 * @example
 * ```ts
 * truncateUtf8("naïve", 3); // "na"; "ï" takes 2 bytes
 * truncateUtf8('say "hi"', 5); // "say "; the escaped quote takes 2 bytes
 * ```
 */
export function truncateUtf8(value: string, maxBytes: number): string {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 0) {
    throw new RangeError(`maxBytes must be a non-negative integer, got ${String(maxBytes)}.`);
  }
  let bytes = 0;
  let index = 0;
  while (index < value.length) {
    const size = escapedSizeAt(value, index);
    if (bytes + size > maxBytes) {
      return value.slice(0, index);
    }
    bytes += size;
    index += unitsOf(size);
  }
  return value;
}
