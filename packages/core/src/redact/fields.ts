import { assertNever } from "../assert-never.js";
import { REDACTED_MARKER } from "../defaults.js";

/** What {@link redactFieldsWith} does with each key and each string. */
export interface FieldRedaction {
  /** Whether the value of this key is replaced with the marker. */
  readonly isSensitive: (key: string) => boolean;
  /** Applied to every other string, including array items. */
  readonly redactText: (text: string) => string;
}

/** A container whose items still have to be copied into `target`. */
type Job =
  | { readonly kind: "array"; readonly source: readonly unknown[]; readonly target: unknown[] }
  | {
      readonly kind: "object";
      readonly source: Readonly<Record<string, unknown>>;
      readonly target: Record<string, unknown>;
    };

/** `Array.isArray` without narrowing to `any[]`. */
function isArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/** Sets an own property, even for keys such as `__proto__`. */
function setOwn(target: Record<string, unknown>, key: string, value: unknown): void {
  Object.defineProperty(target, key, {
    value,
    enumerable: true,
    writable: true,
    configurable: true,
  });
}

/**
 * Returns a redacted copy of a JSON-like value; the input is not changed.
 *
 * Arrays and plain objects are copied at any depth. The value of a sensitive
 * key is replaced with {@link REDACTED_MARKER}, whatever its type; every other
 * string goes through `redactText`. Other values, including class instances,
 * are kept as they are.
 *
 * The walk is iterative, so deeply nested input does not overflow the stack.
 * A container reached twice, as in a cycle, is copied once and the copy keeps
 * the same shape.
 *
 * @param value - Typically the result of `JSON.parse`.
 * @param redaction - Which keys are sensitive and how to redact strings.
 * @returns The redacted copy.
 */
export function redactFieldsWith(value: unknown, redaction: FieldRedaction): unknown {
  const copies = new Map<object, Job["target"]>();
  const pending: Job[] = [];

  const copyOf = (item: unknown): unknown => {
    if (typeof item === "string") {
      return redaction.redactText(item);
    }
    if (!isArray(item) && !isPlainObject(item)) {
      return item;
    }
    const existing = copies.get(item);
    if (existing !== undefined) {
      return existing;
    }
    const job: Job = isArray(item)
      ? { kind: "array", source: item, target: [] }
      : { kind: "object", source: item, target: {} };
    copies.set(item, job.target);
    pending.push(job);
    return job.target;
  };

  const root = copyOf(value);
  for (let job = pending.pop(); job !== undefined; job = pending.pop()) {
    switch (job.kind) {
      case "array":
        for (const item of job.source) {
          job.target.push(copyOf(item));
        }
        break;
      case "object":
        for (const [key, item] of Object.entries(job.source)) {
          setOwn(job.target, key, redaction.isSensitive(key) ? REDACTED_MARKER : copyOf(item));
        }
        break;
      default:
        assertNever(job);
    }
  }
  return root;
}
