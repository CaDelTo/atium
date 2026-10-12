import { quoteForMessage } from "../quote.js";
import { createRedactor, RedactConfigSchema } from "../redact/redactor.js";

/**
 * Creates the function that quotes text received from the user, such as a
 * config value, an unknown key or an environment variable, for an error
 * message: redacted with the default patterns, then quoted and capped with
 * {@link quoteForMessage}. The default patterns are used because the user's
 * `redact` section may be the invalid part.
 *
 * @returns The quoting function. Create one per error, not per value.
 */
export function createReceivedQuoter(): (text: string) => string {
  const { redact } = createRedactor(RedactConfigSchema.parse({}));
  return (text) => quoteForMessage(redact(text));
}
