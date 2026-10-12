import type { LogContext } from "./logger.js";
import type { Redactor } from "./redact/redactor.js";

/** Options for {@link serializeContext}. */
interface SerializeContextOptions {
  /** Removes secrets from the context once it is plain JSON. */
  readonly redactor: Redactor;
  /** Whether to keep the stack of each `Error`. */
  readonly includeStack: boolean;
}

/** State of one walk over a context. */
interface Walk {
  readonly includeStack: boolean;
  /** Objects on the current path, to tell a cycle from a repetition. */
  readonly ancestors: Set<object>;
  /** Every object visited so far, so none is copied twice. */
  readonly seen: Set<object>;
}

/**
 * Written instead of the context when it cannot be serialized. It is already
 * JSON: a string literal, quotes included.
 */
const UNSERIALIZABLE_CONTEXT = '"[unserializable context]"';

/** Written in place of a value that contains itself. */
const CIRCULAR_MARKER = "[Circular]";

/** Written in place of an object already written elsewhere in the context. */
const REPEATED_MARKER = "[Repeated]";

/**
 * Turns a log context into redacted, single-line JSON. Never throws: a
 * context that cannot be serialized, for example because a getter throws,
 * becomes the JSON string `"[unserializable context]"`.
 *
 * Errors become `{ name, message, code?, hint?, stack?, cause? }`, so they can
 * be redacted like any other JSON value; other properties of an error, such as
 * `AggregateError.errors`, are left out. Bigints, symbols and functions become
 * strings. Each object is written once: a later occurrence becomes
 * `"[Repeated]"` and one inside itself becomes `"[Circular]"`, which keeps the
 * cost linear in the size of the context. Like `JSON.stringify`, only own
 * enumerable properties are written, so a `Map` or a `Set` becomes `{}`.
 *
 * @param context - Context passed to a `Logger` method.
 * @param options - Redactor and whether to keep stacks.
 * @returns The JSON text, with every secret replaced.
 */
export function serializeContext(context: LogContext, options: SerializeContextOptions): string {
  try {
    const walk: Walk = {
      includeStack: options.includeStack,
      ancestors: new Set(),
      seen: new Set(),
    };
    return JSON.stringify(options.redactor.redactFields(toPlain(context, walk)));
  } catch {
    return UNSERIALIZABLE_CONTEXT;
  }
}

/** Copies a value into plain JSON data. */
function toPlain(value: unknown, walk: Walk): unknown {
  if (typeof value === "object" && value !== null) {
    return objectToPlain(value, walk);
  }
  if (typeof value === "function") {
    return `[function ${value.name || "anonymous"}]`;
  }
  if (typeof value === "bigint" || typeof value === "symbol") {
    return value.toString();
  }
  return value;
}

function objectToPlain(value: object, walk: Walk): unknown {
  if (walk.seen.has(value)) {
    return walk.ancestors.has(value) ? CIRCULAR_MARKER : REPEATED_MARKER;
  }
  walk.seen.add(value);
  walk.ancestors.add(value);
  try {
    if (value instanceof Error) {
      return toPlain(errorFields(value, walk.includeStack), walk);
    }
    if (Array.isArray(value)) {
      return value.map((item: unknown) => toPlain(item, walk));
    }
    if (hasToJson(value)) {
      return toPlain(value.toJSON(), walk);
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, toPlain(item, walk)]),
    );
  } finally {
    walk.ancestors.delete(value);
  }
}

/** The fields of an error worth logging; `cause` is walked by the caller. */
function errorFields(error: Error, includeStack: boolean): Record<string, unknown> {
  const fields: Record<string, unknown> = { name: error.name, message: error.message };
  if ("code" in error && typeof error.code === "string") {
    fields["code"] = error.code;
  }
  if ("hint" in error && typeof error.hint === "string") {
    fields["hint"] = error.hint;
  }
  if (includeStack && error.stack !== undefined) {
    fields["stack"] = error.stack;
  }
  if (error.cause !== undefined) {
    fields["cause"] = error.cause;
  }
  return fields;
}

/** Tells whether a value serializes through its own `toJSON`, like a `Date`. */
function hasToJson(value: object): value is { toJSON: () => unknown } {
  return "toJSON" in value && typeof value.toJSON === "function";
}
