#!/usr/bin/env node
// PreToolUse hook: blocks changes that weaken or delete existing tests.
//
// Blocks when an edit to a test file:
//   - removes assertions (expect, should, assert, fc.assert)
//   - removes test cases (it, test, it.each, test.each)
//   - adds disabling markers (.skip, .only, .todo, .fixme, xit, xdescribe, xtest)
// and when a shell command deletes or moves a test file.
//
// Exit code 2 blocks the tool call and shows stderr to the agent.
// Any internal error allows the call (fail-open) and logs to stderr.
// The user can disable it for a session with ATIUM_TEST_GUARD=off.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const TEST_FILE = /(\.(test|spec)\.[cm]?[jt]sx?$)|(\/(test|test-contracts)\/)/;
const EXCLUDED = /(^|\/)(examples|fixtures|node_modules|dist)\//;

const PATTERNS = {
  assertions: /\bexpect(?:\.soft)?\s*\(|\.should\s*\(|\bassert(?:\.\w+)?\s*\(|\bfc\.assert\s*\(/g,
  testCases: /\b(?:it|test)(?:\.(?:each\b[^(]*|skip|only|todo|fixme|concurrent))?\s*\(/g,
  disabling: /\.(?:skip|only|todo|fixme)\s*\(|\bx(?:it|describe|test)\s*\(/g,
};

const DELETE_COMMAND =
  /\b(?:rm|unlink|git\s+rm|mv|git\s+mv)\b[^;&|]*?(?:\.(?:test|spec)\.[cm]?[jt]sx?|\/test\/|\/test-contracts\/)/;

function count(text, pattern) {
  return (text.match(pattern) ?? []).length;
}

function metrics(text) {
  return {
    assertions: count(text, PATTERNS.assertions),
    testCases: count(text, PATTERNS.testCases),
    disabling: count(text, PATTERNS.disabling),
  };
}

function toRelative(filePath) {
  const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
  return path.relative(root, path.resolve(root, filePath)).split(path.sep).join("/");
}

function isGuardedFile(filePath) {
  const relative = toRelative(filePath);
  if (relative.startsWith("../")) return false;
  return TEST_FILE.test(`/${relative}`) && !EXCLUDED.test(relative);
}

function beforeAndAfter(toolName, input) {
  switch (toolName) {
    case "Edit":
      return { before: input.old_string ?? "", after: input.new_string ?? "" };
    case "MultiEdit": {
      const edits = Array.isArray(input.edits) ? input.edits : [];
      return {
        before: edits.map((edit) => edit.old_string ?? "").join("\n"),
        after: edits.map((edit) => edit.new_string ?? "").join("\n"),
      };
    }
    case "Write": {
      const absolute = path.resolve(process.env.CLAUDE_PROJECT_DIR ?? process.cwd(), input.file_path);
      const before = existsSync(absolute) ? readFileSync(absolute, "utf8") : "";
      return { before, after: input.content ?? "" };
    }
    default:
      return undefined;
  }
}

function findViolations(before, after) {
  const b = metrics(before);
  const a = metrics(after);
  const violations = [];
  if (a.assertions < b.assertions) {
    violations.push(`removes ${b.assertions - a.assertions} assertion(s)`);
  }
  if (a.testCases < b.testCases) {
    violations.push(`removes ${b.testCases - a.testCases} test case(s)`);
  }
  if (a.disabling > b.disabling) {
    violations.push(`adds ${a.disabling - b.disabling} skip/only/todo/fixme marker(s)`);
  }
  return violations;
}

function block(reason) {
  process.stderr.write(
    [
      `Test guard blocked this change: ${reason}.`,
      "Project rule: never weaken, skip or delete an existing test to make it pass.",
      "If the change is legitimate (for example, moving assertions into a helper or replacing a test with a better one),",
      "stop, explain why to the user and ask them to approve it. Do not try to work around this guard.",
    ].join("\n") + "\n",
  );
  process.exit(2);
}

function main(raw) {
  if (process.env.ATIUM_TEST_GUARD === "off") return;

  const payload = JSON.parse(raw);
  const toolName = payload?.tool_name;
  const input = payload?.tool_input ?? {};

  if (toolName === "Bash") {
    const command = typeof input.command === "string" ? input.command : "";
    if (DELETE_COMMAND.test(command)) {
      block("the command deletes or moves a test file");
    }
    return;
  }

  if (typeof input.file_path !== "string" || !isGuardedFile(input.file_path)) return;

  const texts = beforeAndAfter(toolName, input);
  if (texts === undefined) return;

  const violations = findViolations(texts.before, texts.after);
  if (violations.length > 0) {
    block(`${toRelative(input.file_path)} ${violations.join(", ")}`);
  }
}

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  raw += chunk;
});
process.stdin.on("end", () => {
  try {
    main(raw);
  } catch (error) {
    process.stderr.write(
      `test guard skipped (internal error): ${error instanceof Error ? error.message : String(error)}\n`,
    );
  }
  process.exit(0);
});
