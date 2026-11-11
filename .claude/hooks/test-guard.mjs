#!/usr/bin/env node
// PreToolUse hook: blocks changes that weaken or delete existing tests.
//
// Blocks when an edit to a test file:
//   - removes assertions (expect, expect.soft, expect.poll, should, assert, fc.assert)
//   - removes test cases (it, test, it.each, test.each), including commenting them out
//   - adds disabling markers (.skip, .only, .todo, .fixme, xit, xdescribe, xtest)
// and when a shell command deletes, moves, reverts or empties a test file.
//
// Only code counts: comments and the contents of strings, template literals and
// regex literals are ignored, so RuleTester cases like 'test.only(...)' are not markers.
// Edit and MultiEdit compare the whole file before and after the replacement, or the
// old and new strings when the file is missing or does not contain them.
// In shell commands, quoted text and heredoc bodies are ignored.
//
// Exit code 2 blocks the tool call and shows stderr to the agent.
// Any internal error allows the call (fail-open) and logs to stderr.
// The user can disable it for a session with ATIUM_TEST_GUARD=off.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const TEST_FILE = /(\.(test|spec)\.[cm]?[jt]sx?$)|(\/(test|test-contracts)\/)/;
const EXCLUDED = /(^|\/)(examples|fixtures|node_modules|dist)\//;

const PATTERNS = {
  assertions:
    /\bexpect(?:\.(?:soft|poll))?\s*\(|\.should\s*\(|\bassert(?:\.\w+)?\s*\(|\bfc\.assert\s*\(/g,
  testCases:
    /(?<![.$\w])(?:it|test)(?:\.(?:each\b[^(]*|skip|only|todo|fixme|concurrent))?\s*\(/g,
  disabling: /\.(?:skip|only|todo|fixme)\s*\(|\bx(?:it|describe|test)\s*\(/g,
};

// After these words a `/` starts a regex literal, not a division.
const REGEX_AFTER_WORD = new Set([
  "return",
  "typeof",
  "case",
  "in",
  "of",
  "new",
  "delete",
  "void",
  "throw",
  "instanceof",
  "yield",
  "await",
  "do",
  "else",
]);

const WORD_CHAR = /[\w$]/;

/**
 * Replaces comments and the contents of string, template and regex literals with
 * spaces, keeping line breaks, so the patterns only see code.
 * shortcut: a `/` right after `)`, `]` or `}` is read as division; upgrade to a real
 * tokenizer if `if (x) /re/.test(y)` style code starts to matter.
 */
function codeOnly(text) {
  const out = text.split("");
  const n = text.length;
  const templates = []; // brace depth where each open `${` started
  let depth = 0;
  let regexAllowed = true;

  const blank = (from, to) => {
    for (let k = from; k < Math.min(to, n); k++) {
      if (out[k] !== "\n") out[k] = " ";
    }
  };

  // Strings end at their quote or at the end of the line.
  const skipString = (start, quote) => {
    let j = start + 1;
    while (j < n && text[j] !== quote && text[j] !== "\n")
      j += text[j] === "\\" ? 2 : 1;
    blank(start + 1, j);
    return text[j] === quote ? j + 1 : j;
  };

  // Template text runs until the closing backtick or the next `${`.
  const skipTemplateText = (start) => {
    let j = start;
    while (j < n && text[j] !== "`") {
      if (text[j] === "\\") {
        j += 2;
      } else if (text[j] === "$" && text[j + 1] === "{") {
        blank(start, j);
        templates.push(depth);
        regexAllowed = true;
        return j + 2;
      } else {
        j++;
      }
    }
    blank(start, j);
    regexAllowed = false;
    return j + 1;
  };

  // A regex must close on the same line; otherwise the `/` was not a regex.
  const skipRegex = (start) => {
    let j = start + 1;
    let inClass = false;
    while (j < n && text[j] !== "\n") {
      const c = text[j];
      if (c === "\\") {
        j += 2;
        continue;
      }
      if (c === "/" && !inClass) break;
      if (c === "[") inClass = true;
      else if (c === "]") inClass = false;
      j++;
    }
    if (text[j] !== "/") return start + 1;
    blank(start + 1, j);
    j++;
    while (j < n && WORD_CHAR.test(text[j])) j++;
    return j;
  };

  let i = 0;
  while (i < n) {
    const c = text[i];
    const next = text[i + 1];
    if (c === "/" && next === "/") {
      const end = text.indexOf("\n", i);
      const to = end === -1 ? n : end;
      blank(i, to);
      i = to;
    } else if (c === "/" && next === "*") {
      const end = text.indexOf("*/", i + 2);
      const to = end === -1 ? n : end + 2;
      blank(i, to);
      i = to;
    } else if (c === "'" || c === '"') {
      i = skipString(i, c);
      regexAllowed = false;
    } else if (c === "`") {
      i = skipTemplateText(i + 1);
    } else if (
      c === "}" &&
      templates.length > 0 &&
      templates.at(-1) === depth
    ) {
      templates.pop();
      i = skipTemplateText(i + 1);
    } else if (c === "/" && regexAllowed) {
      const end = skipRegex(i);
      regexAllowed = end === i + 1;
      i = end;
    } else if (WORD_CHAR.test(c)) {
      let j = i + 1;
      while (j < n && WORD_CHAR.test(text[j])) j++;
      regexAllowed = REGEX_AFTER_WORD.has(text.slice(i, j));
      i = j;
    } else {
      if (c === "{") depth++;
      else if (c === "}") depth--;
      if (!/\s/.test(c)) regexAllowed = !")]}".includes(c);
      i++;
    }
  }
  return out.join("");
}

function count(text, pattern) {
  return (text.match(pattern) ?? []).length;
}

function metrics(text) {
  const code = codeOnly(text);
  return {
    assertions: count(code, PATTERNS.assertions),
    testCases: count(code, PATTERNS.testCases),
    disabling: count(code, PATTERNS.disabling),
  };
}

function projectRoot() {
  return process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
}

function toRelative(filePath) {
  const root = projectRoot();
  return path
    .relative(root, path.resolve(root, filePath))
    .split(path.sep)
    .join("/");
}

function isGuardedFile(filePath) {
  const relative = toRelative(filePath);
  if (relative.startsWith("../")) return false;
  return TEST_FILE.test(`/${relative}`) && !EXCLUDED.test(relative);
}

function readCurrent(filePath) {
  const absolute = path.resolve(projectRoot(), filePath);
  return existsSync(absolute) ? readFileSync(absolute, "utf8") : undefined;
}

// Applies the edits like the tool does; undefined when one cannot apply.
function applyEdits(text, edits) {
  let result = text;
  for (const edit of edits) {
    const oldString = edit.old_string ?? "";
    const newString = edit.new_string ?? "";
    const at = oldString === "" ? -1 : result.indexOf(oldString);
    if (at === -1) return undefined;
    result = edit.replace_all
      ? result.split(oldString).join(newString)
      : result.slice(0, at) + newString + result.slice(at + oldString.length);
  }
  return result;
}

function beforeAndAfter(toolName, input) {
  switch (toolName) {
    case "Edit":
    case "MultiEdit": {
      const multi = Array.isArray(input.edits) ? input.edits : [];
      const edits = toolName === "Edit" ? [input] : multi;
      const current = readCurrent(input.file_path);
      const after =
        current === undefined ? undefined : applyEdits(current, edits);
      if (after !== undefined) return { before: current, after };
      return {
        before: edits.map((edit) => edit.old_string ?? "").join("\n"),
        after: edits.map((edit) => edit.new_string ?? "").join("\n"),
      };
    }
    case "Write":
      return {
        before: readCurrent(input.file_path) ?? "",
        after: input.content ?? "",
      };
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
    violations.push(
      `adds ${a.disabling - b.disabling} skip/only/todo/fixme marker(s)`,
    );
  }
  return violations;
}

const TEST_PATH =
  /\.(?:test|spec)\.[cm]?[jt]sx?\b|(?:^|[\s/'"=])(?:test|test-contracts)(?=$|[\s/'"])/;
// Delete, move, revert or empty commands, wherever they appear in a segment
// (`do rm`, `/bin/rm`, `xargs rm`, `git -C . rm`), once quoted text is blanked.
const DELETING =
  /(?:^|[\s/\\])(?:rm|unlink|mv)(?![\w./-])|\bgit\b.*\s(?:restore|checkout(?!.*\s-[bB]\b))(?![\w.-])|\bfind\b.*\s-delete\b/;
const NESTED_SHELL = /(?:^|[\s/\\])(?:eval|(?:ba|z|da)?sh\s+-c)(?=\s)/;
// `>` truncates; `>>` appends and `2>`, `&>`, `>&2` redirect streams.
const REDIRECT = /(?<![>&\d])>(?![>&])/g;
const SEGMENT_END = /[;&|\n(`]|$/g;
// A heredoc body runs from the line after `<<TAG` to a line with only TAG.
// shortcut: `$((a<<b))` reads as an unterminated heredoc and hides the rest of the
// command; upgrade to a shell tokenizer if that ever matters.
const HEREDOC =
  /(?<!<)<<(?!<)-?\s*(['"]?)([A-Za-z_]\w*)\1[^\n]*\n([\s\S]*?)(?=(?<=\n)[\t ]*\2[\t ]*(?:\n|$)|$)/g;
// A heredoc read by a shell (`bash <<EOF`, `cat <<EOF | sh`) is code, not text.
const SHELL_READER = /(?:^|[\s|/])(?:(?:ba|z|da)?sh|eval)(?![\w.-])/;

const spaces = (text) => text.replace(/[^\n]/g, " ");

// Blanks heredoc bodies and quoted text, keeping positions and line breaks of
// heredocs, so commit messages and grep patterns are not read as commands.
function blankText(command) {
  return command
    .replace(HEREDOC, (match, _quote, _tag, body, offset) => {
      const lineStart = command.lastIndexOf("\n", offset) + 1;
      const header = command.slice(lineStart, offset + match.indexOf("\n"));
      if (SHELL_READER.test(header)) return match;
      return match.slice(0, match.length - body.length) + spaces(body);
    })
    .replace(/'[^']*'|"(?:[^"\\]|\\.)*"/g, (quoted) =>
      " ".repeat(quoted.length),
    );
}

/** Whether a shell command deletes, moves, reverts or empties a test file. */
function deletesTestFile(rawCommand) {
  // Join `\` line continuations so `rm -f \` and the path stay in one segment.
  const command = rawCommand.replace(/\\\n/g, "  ");
  const code = blankText(command);
  let start = 0;
  for (const match of code.matchAll(SEGMENT_END)) {
    const segment = command.slice(start, match.index);
    const segmentCode = code.slice(start, match.index);
    start = match.index + 1;
    if (DELETING.test(segmentCode) && TEST_PATH.test(segment)) return true;
    const nested = NESTED_SHELL.exec(segmentCode);
    if (
      nested &&
      deletesTestFile(
        segment.slice(nested.index + nested[0].length).replace(/['"]/g, ""),
      )
    ) {
      return true;
    }
    for (const redirect of segmentCode.matchAll(REDIRECT)) {
      // The target may be quoted, so read it from the original segment.
      const target =
        /^\s*(\S+)/.exec(segment.slice(redirect.index + 1))?.[1] ?? "";
      if (TEST_PATH.test(target)) return true;
    }
  }
  return false;
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
    if (deletesTestFile(command)) {
      block("the command deletes, moves, reverts or empties a test file");
    }
    return;
  }

  if (typeof input.file_path !== "string" || !isGuardedFile(input.file_path))
    return;

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
