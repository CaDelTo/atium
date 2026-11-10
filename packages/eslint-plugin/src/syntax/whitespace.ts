/**
 * Whether a character is whitespace as CSS and XPath define it: space, tab,
 * line feed, carriage return or form feed. Other Unicode spaces, such as the
 * no-break space, are not.
 *
 * @param char - One character.
 * @returns `true` for the five whitespace characters.
 */
export function isSelectorWhitespace(char: string): boolean {
  return char === " " || char === "\t" || char === "\n" || char === "\r" || char === "\f";
}

/**
 * Trims a selector and collapses every run of whitespace outside quotes into
 * one space. A quote opens with `'` or `"` and closes with the same character;
 * backslash escapes are not recognized, so `"a\"  b"` ends its quote early.
 * Idempotent and linear in the length of the text.
 *
 * @param text - The selector.
 * @returns The selector without leading, trailing or repeated whitespace
 *   outside quotes.
 */
export function collapseWhitespace(text: string): string {
  let result = "";
  let quote: string | undefined;
  let pendingSpace = false;
  for (const char of text) {
    if (quote === undefined && isSelectorWhitespace(char)) {
      pendingSpace = result !== "";
      continue;
    }
    if (pendingSpace) {
      result += " ";
      pendingSpace = false;
    }
    result += char;
    if (quote !== undefined) {
      quote = char === quote ? undefined : quote;
    } else if (char === "'" || char === '"') {
      quote = char;
    }
  }
  return result;
}
