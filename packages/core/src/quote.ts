import { ERROR_PATH_PREVIEW_BYTES } from "./defaults.js";
import { truncateUtf8 } from "./model/text.js";

/**
 * Quotes text that may come from data or from the user for an error message:
 * escaped, so it carries no control characters, and capped at
 * {@link ERROR_PATH_PREVIEW_BYTES}, with `…` after the quotes if it was cut.
 *
 * @param value - Any text, such as a path or a config value.
 * @returns The value as a JSON string, possibly followed by `…`.
 */
export function quoteForMessage(value: string): string {
  const shown = truncateUtf8(value, ERROR_PATH_PREVIEW_BYTES);
  return `${JSON.stringify(shown)}${shown.length < value.length ? "…" : ""}`;
}

/**
 * Quotes each item with {@link quoteForMessage} and separates them with commas,
 * as in `"error", "warn", "info"`.
 *
 * @param items - Texts to list, in order.
 * @returns The list, or `""` if `items` is empty.
 */
export function quoteList(items: readonly string[]): string {
  return items.map((item) => quoteForMessage(item)).join(", ");
}
