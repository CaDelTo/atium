import { describe, expect, it } from "vitest";
import { createRedactor, RedactConfigSchema } from "./redact/redactor.js";
import { serializeContext } from "./serialize-context.js";

const redactor = createRedactor(RedactConfigSchema.parse({}));
const options = { redactor, includeStack: false };

function parsed(context: Record<string, unknown>): unknown {
  return JSON.parse(serializeContext(context, options));
}

describe("serializeContext", () => {
  it("keeps JSON values as they are", () => {
    const context = { a: 1, b: "two", c: [true, null], d: { e: 0.5 } };

    expect(parsed(context)).toEqual(context);
  });

  it("replaces a value that contains itself with a marker", () => {
    const node: Record<string, unknown> = { name: "root" };
    node["self"] = node;

    expect(parsed({ node })).toEqual({ node: { name: "root", self: "[Circular]" } });
  });

  it("writes an object once and marks its later occurrences", () => {
    const shared = { id: 1 };

    expect(parsed({ a: shared, b: [shared, shared] })).toEqual({
      a: { id: 1 },
      b: ["[Repeated]", "[Repeated]"],
    });
  });

  it("serializes a deeply shared graph in linear time", () => {
    let node: Record<string, unknown> = { leaf: true };
    for (let level = 0; level < 64; level += 1) {
      node = { a: node, b: node };
    }

    // Copying every occurrence would visit 2^64 nodes and never return.
    const json = serializeContext({ node }, options);

    expect(json.match(/\[Repeated\]/g)).toHaveLength(64);
  });

  it("turns values JSON cannot hold into strings", () => {
    function upload(): void {
      // A function to name in the log.
    }

    expect(
      parsed({ big: 10n, fn: upload, arrow: () => 0, inline: [() => 0], sym: Symbol("s") }),
    ).toEqual({
      big: "10",
      fn: "[function upload]",
      arrow: "[function arrow]",
      inline: ["[function anonymous]"],
      sym: "Symbol(s)",
    });
  });

  it("uses toJSON when a value has one, like a Date", () => {
    expect(parsed({ at: new Date("2026-10-08T14:03:00.000Z") })).toEqual({
      at: "2026-10-08T14:03:00.000Z",
    });
  });

  it("keeps the stack of an error only when asked", () => {
    const error = new Error("boom");

    expect(parsed({ error })).toEqual({ error: { name: "Error", message: "boom" } });
    expect(JSON.parse(serializeContext({ error }, { redactor, includeStack: true }))).toEqual({
      error: { name: "Error", message: "boom", stack: error.stack },
    });
  });

  it("ignores a code or hint that is not a string", () => {
    const error = Object.assign(new Error("boom"), { code: 13, hint: null });

    expect(parsed({ error })).toEqual({ error: { name: "Error", message: "boom" } });
  });

  it("stops at an error that is its own cause", () => {
    const error = new Error("loop");
    error.cause = error;

    expect(parsed({ error })).toEqual({
      error: { name: "Error", message: "loop", cause: "[Circular]" },
    });
  });

  it("serializes a thrown value that is not an error as it is", () => {
    expect(parsed({ error: "plain string" })).toEqual({ error: "plain string" });
  });

  it("redacts sensitive fields at any depth", () => {
    expect(parsed({ request: { body: { password: "hunter2" } } })).toEqual({
      request: { body: { password: "[REDACTED]" } },
    });
  });

  it("returns a marker when reading the context throws", () => {
    const context = {
      get broken(): string {
        throw new Error("getter failed");
      },
    };

    expect(serializeContext(context, options)).toBe('"[unserializable context]"');
  });
});
