import { posix, resolve, sep, win32 } from "node:path";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { resolveInside, resolveInsideWith, toPosixRelative } from "./paths.js";

// Fixed seed, so a failure reproduces (04-testing.md, "Determinismo").
const runOptions = { seed: 20261012, numRuns: 500 };

/**
 * A file or directory name that both POSIX and Windows open as written: no
 * trailing dot or space, and no device name such as `CON`.
 */
const segment = fc
  .stringMatching(/^[\w-][\w.\- ]{0,10}[\w-]$|^[\w-]$/)
  .filter((name) => !/^(?:con|prn|aux|nul|com\d|lpt\d)(?:\.|$)/i.test(name));
const segments = fc.array(segment, { minLength: 1, maxLength: 6 });

function thrownBy(action: () => unknown): unknown {
  try {
    action();
  } catch (error) {
    return error;
  }
  return undefined;
}

function messageOf(action: () => unknown): string {
  const error = thrownBy(action);
  return error instanceof Error ? error.message : "";
}

function expectModelInvalid(action: () => unknown): void {
  expect(thrownBy(action)).toMatchObject({ name: "AtiumError", code: "MODEL_INVALID" });
}

describe("toPosixRelative", () => {
  it.each([
    ["a Windows path", "C:\\repo", "C:\\repo\\tests\\a.spec.ts"],
    ["a Windows path with forward slashes", "C:/repo", "C:/repo/tests/a.spec.ts"],
    ["a Windows root with a trailing separator", "C:\\repo\\", "C:\\repo\\tests\\a.spec.ts"],
    ["a Windows path with another drive letter case", "C:\\repo", "c:\\repo\\tests\\a.spec.ts"],
    ["a Windows path with mixed separators", "C:\\repo", "C:\\repo/tests\\a.spec.ts"],
    ["a UNC path", "\\\\server\\share\\repo", "\\\\server\\share\\repo\\tests\\a.spec.ts"],
    ["a POSIX path", "/repo", "/repo/tests/a.spec.ts"],
    ["a POSIX path with . and .. segments", "/repo", "/repo/./src/../tests/a.spec.ts"],
    ["a path relative to the root", "/repo", "tests/a.spec.ts"],
  ])("normalizes %s to tests/a.spec.ts", (_label, root, file) => {
    expect(toPosixRelative(root, file)).toBe("tests/a.spec.ts");
  });

  it("keeps a backslash in a POSIX file name, where it is a regular character", () => {
    expect(toPosixRelative("/repo", "/repo/tests/a\\b.spec.ts")).toBe("tests/a\\b.spec.ts");
  });

  it.each([
    ["a POSIX path outside the root", "/repo", "/other/a.spec.ts"],
    ["a POSIX path with a misleading prefix", "/repo", "/repo-evil/a.spec.ts"],
    ["a path that climbs out with ..", "/repo", "/repo/../a.spec.ts"],
    ["the root itself", "/repo", "/repo"],
    ["a Windows path outside the root", "C:\\repo", "C:\\other\\a.spec.ts"],
    ["a Windows path on another drive", "C:\\repo", "D:\\repo\\a.spec.ts"],
    ["a Windows path on another UNC share", "\\\\server\\share\\repo", "\\\\server\\other\\a.ts"],
  ])("rejects %s", (_label, root, file) => {
    expectModelInvalid(() => toPosixRelative(root, file));
  });

  it("quotes and caps the path in its error message", () => {
    const message = messageOf(() =>
      toPosixRelative("/repo", `/other/\u001b[2J${"a".repeat(1000)}`),
    );

    expect(message).toContain('"/other/\\u001b[2J');
    expect(message).not.toContain("\u001b");
    expect(message).toContain("…");
    expect(message).not.toContain("a".repeat(300));
  });

  it("gives the same POSIX result for the same segments under a POSIX and a Windows root", () => {
    fc.assert(
      fc.property(segments, segments, (rootParts, fileParts) => {
        const fromPosix = toPosixRelative(
          posix.join("/", ...rootParts),
          posix.join("/", ...rootParts, ...fileParts),
        );
        const fromWindows = toPosixRelative(
          win32.join("C:\\", ...rootParts),
          win32.join("C:\\", ...rootParts, ...fileParts),
        );

        expect(fromPosix).toBe(fileParts.join("/"));
        expect(fromWindows).toBe(fromPosix);
      }),
      runOptions,
    );
  });

  it("never returns a backslash, a leading slash or a leading .. for a Windows path", () => {
    fc.assert(
      fc.property(segments, segments, (rootParts, fileParts) => {
        const relative = toPosixRelative(
          win32.join("C:\\", ...rootParts),
          win32.join("C:\\", ...rootParts, ...fileParts),
        );

        expect(relative).not.toContain("\\");
        expect(relative.startsWith("/")).toBe(false);
        expect(relative.startsWith("../")).toBe(false);
      }),
      runOptions,
    );
  });
});

/**
 * Independent oracle: walks the steps from the root as a stack of names and
 * tells whether the result is strictly below the root.
 */
function staysInside(
  rootParts: readonly string[],
  steps: readonly string[],
  ignoreCase: boolean,
): boolean {
  const stack = [...rootParts];
  for (const step of steps) {
    if (step === "..") {
      stack.pop();
    } else if (step !== ".") {
      stack.push(step);
    }
  }
  const same = (a: string | undefined, b: string): boolean =>
    ignoreCase ? a?.toLowerCase() === b.toLowerCase() : a === b;
  return stack.length > rootParts.length && rootParts.every((name, i) => same(stack[i], name));
}

describe("resolveInsideWith", () => {
  describe.each([
    ["POSIX", posix, "/repo"],
    ["Windows", win32, "C:\\repo"],
  ])("with %s paths", (_label, api, root) => {
    it.each([
      ["a relative path", "test-results/trace.zip"],
      ["a path with a .. that stays inside", "test-results/../reports/a.json"],
      ["a name that starts with ..", "..cache/a.json"],
      ["a name that starts like a device name", "console.log"],
      ["an absolute path inside the root", api.join(root, "tests", "a.spec.ts")],
    ])("accepts %s", (_case, relative) => {
      const resolved = resolveInsideWith(api, root, relative);

      expect(resolved).toBe(api.resolve(root, relative));
      expect(resolved.startsWith(root + api.sep)).toBe(true);
    });

    it.each([
      ["a path that climbs out with ../", "../secret"],
      ["a path that climbs out after going in", "a/../../secret"],
      ["only ..", ".."],
      ["the root itself", "."],
      ["an empty path", ""],
      ["an absolute path outside the root", api.join(api.parse(root).root, "etc", "passwd")],
      ["a sibling with a misleading prefix", `${root}-evil${api.sep}a.json`],
      ["a NUL character", "a\u0000b.json"],
    ])("rejects %s", (_case, relative) => {
      expectModelInvalid(() => resolveInsideWith(api, root, relative));
    });

    it("accepts exactly the paths that stay strictly inside the root", () => {
      const rootParts = root.split(api.sep).slice(1);
      const step = fc.oneof(segment, fc.constantFrom("..", ".", "repo", "Repo"));
      fc.assert(
        fc.property(fc.array(step, { minLength: 1, maxLength: 8 }), (steps) => {
          const relative = steps.join(api.sep);

          if (staysInside(rootParts, steps, api === win32)) {
            expect(resolveInsideWith(api, root, relative)).toBe(api.resolve(root, relative));
          } else {
            expectModelInvalid(() => resolveInsideWith(api, root, relative));
          }
        }),
        runOptions,
      );
    });

    it("quotes and caps the path in its error message", () => {
      const message = messageOf(() =>
        resolveInsideWith(api, root, `../x\nERROR forged ${"a".repeat(1000)}`),
      );

      expect(message).toContain('"../x\\nERROR forged');
      expect(message).not.toContain("\n");
      expect(message).toContain("…");
      expect(message).not.toContain("a".repeat(300));
    });
  });

  describe("with Windows paths only", () => {
    it.each([
      {
        label: "a drive-relative path on the same drive",
        root: "C:\\repo",
        relative: "C:foo",
        expected: "C:\\repo\\foo",
      },
      {
        label: "a drive letter in another case",
        root: "C:\\repo",
        relative: "c:\\repo\\a.json",
        expected: "c:\\repo\\a.json",
      },
      {
        label: "a root with a trailing separator",
        root: "C:\\repo\\",
        relative: "a.json",
        expected: "C:\\repo\\a.json",
      },
      { label: "the root of a drive", root: "C:\\", relative: "a.json", expected: "C:\\a.json" },
    ])("accepts $label", ({ root, relative, expected }) => {
      expect(resolveInsideWith(win32, root, relative)).toBe(expected);
    });

    it.each([
      ["a path on another drive", "D:\\repo\\a.json"],
      ["a drive-relative path on another drive", "D:foo"],
      ["a path rooted on the current drive", "\\foo"],
      ["a drive-relative path that climbs out", "C:..\\x"],
      ["a UNC path", "\\\\server\\share\\x"],
      ["a \\\\?\\ path", "\\\\?\\C:\\repo\\a.json"],
      ["a \\\\.\\ device path", "\\\\.\\C:\\repo\\a.json"],
      ["a segment with a trailing space that could become ..", ".. \\x"],
      ["a segment with a trailing dot", "a.\\b.json"],
      ["a file name with a trailing dot", "a.json."],
      ["a file name with a trailing space", "a.json "],
      ["a device name", "CON"],
      ["a device name with an extension", "nul.txt"],
      ["a device name in a directory", "logs\\com1.log"],
    ])("rejects %s", (_case, relative) => {
      expectModelInvalid(() => resolveInsideWith(win32, "C:\\repo", relative));
    });
  });

  describe("with POSIX paths only", () => {
    it.each([
      ["a device name of Windows", "CON"],
      ["a file name with a trailing dot", "a.json."],
      ["a backslash in a file name", "..\\x"],
    ])("accepts %s, which is a regular file name", (_case, relative) => {
      expect(resolveInsideWith(posix, "/repo", relative)).toBe(posix.resolve("/repo", relative));
    });

    it("accepts any path under the filesystem root", () => {
      expect(resolveInsideWith(posix, "/", "etc/hosts")).toBe("/etc/hosts");
    });
  });

  it("resolves a relative root against the current directory", () => {
    expect(resolveInsideWith(posix, "repo", "a.json")).toBe(posix.resolve("repo", "a.json"));
    expectModelInvalid(() => resolveInsideWith(posix, "repo", "../a.json"));
  });
});

describe("resolveInside", () => {
  it("resolves with the path format of the operating system", () => {
    const root = `${sep}repo`;

    expect(resolveInside(root, "a.json")).toBe(resolve(root, "a.json"));
    expectModelInvalid(() => resolveInside(root, `..${sep}secret`));
  });
});
