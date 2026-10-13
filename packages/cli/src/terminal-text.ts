// Loaded by every invocation, `--help` included: it must not import
// `@atium/core` (05-performance.md, "Arranque del CLI").

/**
 * Control characters (C0, DEL and C1, which includes the CSI that starts ANSI
 * sequences), Unicode line breaks and the bidirectional overrides and
 * isolates, which could hide or reorder text in a terminal.
 */
const UNSAFE_CHARACTERS = /[\p{Cc}\u2028\u2029\u202a-\u202e\u2066-\u2069]/gu;

/**
 * Makes text safe to write to a terminal as it is: every unsafe character
 * except the line feed and the tab becomes a `\uXXXX` escape, so the text
 * cannot drive the terminal or forge other output, but keeps its lines.
 *
 * @param text - Text that may carry values from the user or the project.
 * @returns The text with those characters escaped.
 */
export function terminalText(text: string): string {
  return text.replace(UNSAFE_CHARACTERS, (character) =>
    character === "\n" || character === "\t"
      ? character
      : `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
}
