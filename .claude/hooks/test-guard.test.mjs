// Run with `pnpm test:claude` (part of `pnpm verify`).
// Runs the real hook as Claude Code does: JSON on stdin, exit 2 blocks, exit 0 allows.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const HOOK = fileURLToPath(new URL("./test-guard.mjs", import.meta.url));
const ROOT = mkdtempSync(path.join(tmpdir(), "test-guard-"));
const FILE = "packages/eslint-plugin/src/rules/a.test.ts";
const ALLOWED = 0;
const BLOCKED = 2;

after(() => rmSync(ROOT, { recursive: true, force: true }));

function runHook(stdin, extraEnv = {}) {
  const { ATIUM_TEST_GUARD: _ignored, ...env } = process.env;
  const result = spawnSync(process.execPath, [HOOK], {
    input: stdin,
    env: { ...env, CLAUDE_PROJECT_DIR: ROOT, ...extraEnv },
    encoding: "utf8",
  });
  return result.status;
}

function run(toolName, toolInput, extraEnv) {
  return runHook(
    JSON.stringify({ tool_name: toolName, tool_input: toolInput }),
    extraEnv,
  );
}

function onDisk(content) {
  const absolute = path.join(ROOT, FILE);
  mkdirSync(path.dirname(absolute), { recursive: true });
  writeFileSync(absolute, content);
}

function write(before, content) {
  onDisk(before);
  return run("Write", { file_path: FILE, content });
}

function edit(before, oldString, newString, extra = {}) {
  onDisk(before);
  return run("Edit", {
    file_path: FILE,
    old_string: oldString,
    new_string: newString,
    ...extra,
  });
}

const RULE_TEST = [
  'ruleTester.run("E2E010", rule, {',
  "  valid: [{ code: 'test(\"t\", () => {})' }],",
  "  invalid: [",
  `    { code: 'test.only("t", () => {})', errors: [{ messageId: "only" }] },`,
  '    { code: "describe.only(\\"s\\", () => {})", errors: [{ messageId: "only" }] },',
  "    {",
  "      code: `",
  '        test.skip("t", () => {});',
  '        it.only("x", ${callback});',
  "      `,",
  '      errors: [{ messageId: "only" }],',
  "    },",
  "  ],",
  "});",
  "",
].join("\n");

const SKIP_LINE = 'test.skip("t", () => {});';
const ONLY_LINE = '\n        test.only("u", () => {});';

describe("literals and comments", () => {
  it("allows writing a RuleTester file whose cases contain .only( and .skip( in strings", () => {
    assert.equal(write("", RULE_TEST), ALLOWED);
  });

  it("allows an edit inside a multi-line template literal that adds .only(", () => {
    assert.equal(edit(RULE_TEST, SKIP_LINE, SKIP_LINE + ONLY_LINE), ALLOWED);
  });

  it("allows replacing a regex .test( call, which is not a test case", () => {
    const before =
      'it("has a code", () => {\n  expect(/^E2E\\d{3}$/u.test(code)).toBe(true);\n});\n';
    const status = edit(
      before,
      "expect(/^E2E\\d{3}$/u.test(code)).toBe(true)",
      "expect(isCode(code)).toBe(true)",
    );
    assert.equal(status, ALLOWED);
  });

  it("allows removing a regex literal that contains it( and .skip(", () => {
    const before =
      'it("x", () => {\n  const re = /it(a)|\\.skip(b)/u;\n  expect(1).toBe(1);\n});\n';
    assert.equal(
      edit(before, "  const re = /it(a)|\\.skip(b)/u;\n", ""),
      ALLOWED,
    );
  });

  it("reads a / after a value as a division", () => {
    const before = 'const a = b / 2; it("x", () => {}); const c = d / 3;\n';
    assert.equal(edit(before, 'it("x", () => {}); ', ""), BLOCKED);
  });

  it("reads a / after return as a regex", () => {
    const before = 'function f() { return /it(x)/u; }\nit("x", () => {});\n';
    assert.equal(edit(before, "return /it(x)/u;", "return null;"), ALLOWED);
  });

  it("does not end a regex at a / inside a character class", () => {
    const before = 'const re = /[/]it(x)/u;\nit("x", () => {});\n';
    assert.equal(edit(before, "const re = /[/]it(x)/u;\n", ""), ALLOWED);
  });

  it("does not end a string at an escaped quote", () => {
    assert.equal(write("", "const s = 'it\\'s test.only(';\n"), ALLOWED);
  });

  it("ends a string at the line break, so an apostrophe in JSX text hides nothing", () => {
    const before = 'const view = <p>don\'t</p>;\nit("x", () => {});\n';
    assert.equal(
      edit(before, 'it("x", () => {});', 'it.only("x", () => {});'),
      BLOCKED,
    );
  });

  it("does not end a template literal at an escaped backtick", () => {
    assert.equal(write("", "const s = `a \\` test.only(`;\n"), ALLOWED);
  });

  it("ignores markers in comments", () => {
    const content =
      '// it.only( and test.skip( are forbidden\n/* xit( */\nit("x", () => {});\n';
    assert.equal(write("", content), ALLOWED);
  });

  it("treats commenting out a test as removing it", () => {
    const before = 'it("x", () => {\n  expect(1).toBe(1);\n});\n';
    assert.equal(
      edit(before, before, `// ${before.replaceAll("\n", "\n// ")}`),
      BLOCKED,
    );
  });

  it("scans ${} expressions in templates as code", () => {
    assert.equal(
      write("", "const s = `${test.only('x', () => {})}`;\n"),
      BLOCKED,
    );
  });
});

describe("real weakening is still blocked", () => {
  const SUITE =
    'describe("s", () => {\n  it("a", () => {\n    expect(1).toBe(1);\n  });\n});\n';

  it("blocks adding .only( in code", () => {
    assert.equal(edit(SUITE, 'it("a"', 'it.only("a"'), BLOCKED);
  });

  it("blocks adding .skip( in code", () => {
    assert.equal(edit(SUITE, 'it("a"', 'it.skip("a"'), BLOCKED);
  });

  it("blocks removing a test case", () => {
    assert.equal(write(SUITE, 'describe("s", () => {});\n'), BLOCKED);
  });

  it("blocks removing an assertion", () => {
    assert.equal(edit(SUITE, "    expect(1).toBe(1);\n", ""), BLOCKED);
  });

  it("allows replacing expect( with expect.poll(", () => {
    assert.equal(
      edit(SUITE, "expect(1).toBe(1)", "await expect.poll(() => 1).toBe(1)"),
      ALLOWED,
    );
  });

  it("does not count asymmetric matchers like expect.any( as assertions", () => {
    const before =
      'it("a", () => {\n  expect(x).toEqual(expect.any(String));\n});\n';
    assert.equal(edit(before, "expect.any(String)", "anyString"), ALLOWED);
  });

  it("allows adding a test", () => {
    assert.equal(
      edit(SUITE, "  });\n});", '  });\n  it("b", () => {});\n});'),
      ALLOWED,
    );
  });
});

describe("edits are applied to the whole file", () => {
  const TWO = 'it("a", () => {});\nit("b", () => {});\n';

  it("applies replace_all to every occurrence", () => {
    assert.equal(edit(TWO, "it(", "it.skip(", { replace_all: true }), BLOCKED);
  });

  it("applies MultiEdit edits in order", () => {
    onDisk(RULE_TEST);
    const renamed = 'test.skip("t2", () => {});';
    const status = run("MultiEdit", {
      file_path: FILE,
      edits: [
        { old_string: SKIP_LINE, new_string: renamed },
        { old_string: renamed, new_string: renamed + ONLY_LINE },
      ],
    });
    assert.equal(status, ALLOWED);
  });

  it("does not expand $& in the replacement", () => {
    assert.equal(edit(TWO, 'it("a", () => {});', "$&"), BLOCKED);
  });

  it("falls back to the fragments when old_string is not in the file", () => {
    assert.equal(edit("", 'it("gone", () => {});', ""), BLOCKED);
    assert.equal(
      edit("", 'it("gone", () => {});', 'it("gone", () => {}); // edited'),
      ALLOWED,
    );
  });

  it("ignores files that are not tests", () => {
    assert.equal(
      run("Write", { file_path: "packages/core/src/a.ts", content: "" }),
      ALLOWED,
    );
  });
});

describe("shell commands", () => {
  const blocked = [
    "rm packages/core/src/a.test.ts",
    "rm -rf packages/core/test",
    "cd packages/core && git rm test-contracts/storage.ts",
    "mv src/a.test.ts src/b.ts",
    "git checkout -- packages/core/src/a.test.ts",
    "git restore packages/core/src/a.spec.ts",
    'find packages -name "*.test.ts" -delete',
    "find packages -name '*.test.ts' -exec rm {} +",
    ": > packages/core/src/a.test.ts",
    'echo "" > "packages/core/src/a.test.ts"',
    'bash -c "rm packages/core/src/a.test.ts"',
    "(rm packages/core/src/a.test.ts)",
    "for f in a; do rm packages/core/src/a.test.ts; done",
    "if true; then rm packages/core/src/a.test.ts; fi",
    "/bin/rm packages/core/src/a.test.ts",
    "\\rm packages/core/src/a.test.ts",
    "xargs rm packages/core/src/a.test.ts",
    "timeout 5 rm packages/core/src/a.test.ts",
    "git -C . rm packages/core/src/a.test.ts",
    "cat <<EOF\nnotes\nEOF\nrm packages/core/src/a.test.ts",
    "cat <<EOF > packages/core/src/a.test.ts\nx\nEOF",
    "bash <<'EOF'\nrm packages/core/src/a.test.ts\nEOF",
    "cat <<EOF | sh\nrm packages/core/src/a.test.ts\nEOF",
    "cat <<EOF\nEOF\nrm packages/core/src/a.test.ts",
    "rm -f \\\n  packages/core/src/a.test.ts",
  ];

  for (const command of blocked) {
    it(`blocks ${command}`, () => {
      assert.equal(run("Bash", { command }), BLOCKED);
    });
  }

  const allowed = [
    "git commit -m 'explain mv old.test.ts'",
    "grep -rn 'rm foo.test.ts' docs",
    "git checkout -b test/12-new-rule",
    "pnpm test 2> packages/core/src/a.test.ts.log",
    "cat a.ts >> packages/core/src/a.test.ts",
    "rm -rf dist",
    "pnpm --filter @atium/core test",
    "git commit -F - <<'EOF'\nchore: note\n\nrm packages/core/src/a.test.ts\nEOF",
    'find packages -name "*.test.ts" -exec grep -l foo {} +',
    `git commit -m "$(cat <<'EOF'\nchore: don't keep it\n\nrm packages/core/src/a.test.ts\nEOF\n)"`,
    "pnpm vitest run packages/mv/a.test.ts",
  ];

  for (const command of allowed) {
    it(`allows ${command}`, () => {
      assert.equal(run("Bash", { command }), ALLOWED);
    });
  }
});

describe("fail-open and opt-out", () => {
  it("allows the call when the payload is not valid JSON", () => {
    assert.equal(runHook("{not json"), ALLOWED);
  });

  it("allows everything with ATIUM_TEST_GUARD=off", () => {
    assert.equal(
      run("Bash", { command: "rm a.test.ts" }, { ATIUM_TEST_GUARD: "off" }),
      ALLOWED,
    );
  });
});
