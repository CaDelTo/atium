import { z } from "zod";
import { AtiumError } from "../errors.js";
import { quoteForMessage, quoteList } from "../quote.js";
import { createReceivedQuoter } from "./quote-received.js";
import { didYouMean, suggestKey } from "./suggest.js";

type Issue = z.core.$ZodIssue;
type Schema = z.core.$ZodType;
type Quote = (text: string) => string;

/** A key that can follow a dot in a path without quoting. */
const PLAIN_KEY = /^[A-Za-z_$][\w$-]*$/;

/**
 * Builds the `CONFIG_INVALID` error for the issues Zod found in a config
 * (03-errors-logging.md, "Mensajes de error"): one line per issue with the key
 * path and the value received, and a hint that suggests the closest known key
 * for each misspelled one and lists the valid keys for the others.
 *
 * Received strings, unknown keys and key paths go through the default
 * redaction patterns and are capped, so a secret pasted in the wrong place
 * does not reach the logs whole.
 *
 * @param source - The config file, as shown to the user.
 * @param schema - The schema the config was validated with, to find the keys
 * valid where an unknown one was found.
 * @param issues - The issues of the failed validation, parsed with
 * `reportInput: true` so they carry the value received. Zod always reports
 * at least one.
 * @returns The error, with one line of the message per issue.
 */
export function configInvalidError(
  source: string,
  schema: Schema,
  issues: readonly Issue[],
): AtiumError {
  const quote = createReceivedQuoter();
  const lines = issues.map((issue) => describeIssue(issue, quote));
  const message =
    lines.length === 1
      ? `Invalid config in ${source}: ${lines.join("")}`
      : [`Invalid config in ${source}:`, ...lines.map((line) => `- ${line}`)].join("\n");
  return new AtiumError("CONFIG_INVALID", message, {
    hint: hintFor(issues, { source, schema, quote }),
  });
}

function describeIssue(issue: Issue, quote: Quote): string {
  if (issue.code === "unrecognized_keys") {
    const noun = issue.keys.length === 1 ? "key" : "keys";
    return `Unknown ${noun} ${issue.keys.map(quote).join(", ")} ${where(issue.path, quote)}.`;
  }
  const subject = issue.path.length === 0 ? "The config" : quote(formatPath(issue.path));
  const received = `(received ${preview(issue.input, quote)})`;
  if (issue.code === "invalid_type") {
    return `${subject} must be ${withArticle(issue.expected)} ${received}.`;
  }
  // Every other code keeps the message Zod or the schema gives it.
  return `${subject}: ${issue.message} ${received}.`;
}

/** Where an object is: `at the top level` or `in "quarantine"`. */
function where(path: readonly PropertyKey[], quote: Quote): string {
  return path.length === 0 ? "at the top level" : `in ${quote(formatPath(path))}`;
}

interface HintContext {
  readonly source: string;
  readonly schema: Schema;
  readonly quote: Quote;
}

interface SuggestedKey {
  readonly key: string;
  readonly suggestion: string;
}

/**
 * Suggests the closest known key for each unknown key that has one and, for
 * the rest, lists the keys valid where they were found. Without unknown keys,
 * points at the values listed in the message.
 */
function hintFor(issues: readonly Issue[], context: HintContext): string {
  const advice = issues.flatMap((issue) =>
    issue.code === "unrecognized_keys" ? [adviceFor(issue, context)] : [],
  );
  const suggested = advice.flatMap(({ suggested: keys }) => keys);
  const removals = advice.flatMap(({ removal }) => (removal === undefined ? [] : [removal]));
  const [only] = suggested;
  if (only !== undefined && suggested.length === 1 && removals.length === 0) {
    return didYouMean(only.suggestion);
  }
  const pairs = suggested.map(
    ({ key, suggestion }) => `${quoteForMessage(suggestion)} instead of ${context.quote(key)}`,
  );
  const sentences =
    pairs.length === 0 ? removals : [`Did you mean ${pairs.join(", ")}?`, ...removals];
  return sentences.length === 0
    ? `Fix the values listed above in ${context.source}.`
    : sentences.join(" ");
}

/** The suggestions for the unknown keys of one object, and how to fix the keys without one. */
function adviceFor(
  issue: z.core.$ZodIssueUnrecognizedKeys,
  { schema, quote }: HintContext,
): { readonly suggested: readonly SuggestedKey[]; readonly removal: string | undefined } {
  const known = knownKeysAt(schema, issue.path);
  const suggested: SuggestedKey[] = [];
  const unmatched: string[] = [];
  for (const key of issue.keys) {
    const suggestion = suggestKey(key, known);
    if (suggestion === undefined) {
      unmatched.push(key);
    } else {
      suggested.push({ key, suggestion });
    }
  }
  if (unmatched.length === 0) {
    return { suggested, removal: undefined };
  }
  const keys = unmatched.map(quote).join(", ");
  const removal =
    known.length === 0
      ? `Remove ${keys}.`
      : `Remove ${keys} or use a key valid ${where(issue.path, quote)}: ${quoteList(known)}.`;
  return { suggested, removal };
}

/**
 * Keys valid in the object at `path`, following the schema through optional,
 * default and readonly wrappers, records and arrays. Empty if the path does
 * not lead to an object schema.
 */
function knownKeysAt(schema: Schema, path: readonly PropertyKey[]): readonly string[] {
  let current: Schema | undefined = unwrap(schema);
  for (const segment of path) {
    current = current === undefined ? undefined : childAt(current, segment);
    current = current === undefined ? undefined : unwrap(current);
  }
  return current instanceof z.ZodObject ? Object.keys(current.shape) : [];
}

function childAt(schema: Schema, segment: PropertyKey): Schema | undefined {
  if (schema instanceof z.ZodObject) {
    const shape: Readonly<Record<string, Schema>> = schema.shape;
    return typeof segment === "string" && Object.hasOwn(shape, segment)
      ? shape[segment]
      : undefined;
  }
  if (schema instanceof z.ZodRecord) {
    return schema.valueType;
  }
  if (schema instanceof z.ZodArray) {
    return schema.element;
  }
  return undefined;
}

function unwrap(schema: Schema): Schema {
  let current = schema;
  while (
    current instanceof z.ZodOptional ||
    current instanceof z.ZodDefault ||
    current instanceof z.ZodPrefault ||
    current instanceof z.ZodReadonly
  ) {
    current = current.unwrap();
  }
  return current;
}

/** `analyzers.flaky.windowDays`, `adapters[0]`, `analyzers["my.analyzer"]`. */
function formatPath(path: readonly PropertyKey[]): string {
  return path
    .map((segment, index) => {
      if (typeof segment === "number") {
        return `[${String(segment)}]`;
      }
      const key = String(segment);
      if (!PLAIN_KEY.test(key)) {
        return `[${JSON.stringify(key)}]`;
      }
      return index === 0 ? key : `.${key}`;
    })
    .join("");
}

function withArticle(noun: string): string {
  return /^[aeiou]/i.test(noun) ? `an ${noun}` : `a ${noun}`;
}

/** The value received, as shown in a message: strings redacted, quoted and capped; anything else but primitives, by kind. */
function preview(value: unknown, quote: Quote): string {
  if (typeof value === "string") {
    return quote(value);
  }
  if (
    typeof value === "number" ||
    typeof value === "bigint" ||
    typeof value === "boolean" ||
    value === undefined ||
    value === null
  ) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return "an array";
  }
  // An object, a function or a symbol.
  return withArticle(typeof value);
}
