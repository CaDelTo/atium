import { AtiumError } from "@atium/core";
import { describe, expect, it } from "vitest";
import { fakeRun } from "../test/fake-io.js";
import type { CliCommand } from "./commands/command.js";
import type { CommandContext } from "./command-context.js";
import { run } from "./run.js";
import { UsageError } from "./usage-error.js";

/** A command that throws `error`, or that writes a result if none is given. */
function probe(error?: Error): CliCommand {
  return {
    name: "probe",
    description: "test command",
    run: (context) => {
      if (error !== undefined) {
        return Promise.reject(error);
      }
      context.stdout.write("result\n");
      context.logger.info("probe ran");
      return Promise.resolve();
    },
  };
}

/** A command that keeps the context it received. */
function recorder(): { command: CliCommand; contexts: CommandContext[] } {
  const contexts: CommandContext[] = [];
  return {
    contexts,
    command: {
      name: "probe",
      description: "test command",
      run: (context) => {
        contexts.push(context);
        return Promise.resolve();
      },
    },
  };
}

const configError = new AtiumError("CONFIG_INVALID", 'Invalid config in "atium.config.ts".', {
  hint: 'Did you mean "storage"?',
});

describe("run", () => {
  describe("when the command finishes", () => {
    it("exits with 0 and writes results to stdout and logs to stderr", async () => {
      const options = fakeRun(["probe"], { commands: [probe()] });

      expect(await run(options)).toBe(0);
      expect(options.stdout.text).toBe("result\n");
      expect(options.stderr.text).toBe("atium:cli info probe ran\n");
    });

    it("logs only errors with --quiet", async () => {
      const options = fakeRun(["probe", "--quiet"], { commands: [probe()] });

      expect(await run(options)).toBe(0);
      expect(options.stdout.text).toBe("result\n");
      expect(options.stderr.text).toBe("");
    });
  });

  describe("help", () => {
    it("writes the help to stdout and exits with 0", async () => {
      const options = fakeRun(["--help"]);

      expect(await run(options)).toBe(0);
      expect(options.stdout.text).toContain("Usage: atium");
      expect(options.stdout.text).toContain("init");
      expect(options.stderr.text).toBe("");
    });

    it("lists every global option", async () => {
      const options = fakeRun(["--help"]);

      await run(options);

      for (const flag of [
        "--config",
        "--format",
        "--output",
        "--ci",
        "--strict",
        "--quiet",
        "--verbose",
      ]) {
        expect(options.stdout.text).toContain(flag);
      }
    });
  });

  describe("usage errors exit with 2", () => {
    it.each([
      ["an unknown option", ["--bogus"]],
      ["an unknown command", ["bogus"]],
      ["no command", []],
      ["--quiet with --verbose", ["probe", "--quiet", "--verbose"]],
      ["an extra argument", ["probe", "extra"]],
      ["--config without a value", ["probe", "--config"]],
    ])("on %s", async (_case, argv) => {
      const options = fakeRun(argv, { commands: [probe()] });

      expect(await run(options)).toBe(2);
      expect(options.stderr.text).not.toBe("");
      expect(options.stdout.text).toBe("");
    });

    it("on a UsageError, with its message and hint on stderr", async () => {
      const options = fakeRun(["probe"], {
        commands: [probe(new UsageError("Cannot do that.", "Do this instead."))],
      });

      expect(await run(options)).toBe(2);
      expect(options.stderr.text).toBe("Cannot do that.\n  Hint: Do this instead.\n");
      expect(options.stdout.text).toBe("");
    });
  });

  describe("configuration errors exit with 2", () => {
    it.each([[[]], [["--strict"]]])("with the flags %j", async (flags) => {
      const options = fakeRun(["probe", ...flags], { commands: [probe(configError)] });

      expect(await run(options)).toBe(2);
      expect(options.stderr.text).toBe(
        'Invalid config in "atium.config.ts".\n  Hint: Did you mean "storage"?\n',
      );
      expect(options.stdout.text).toBe("");
    });

    it("on CONFIG_NOT_FOUND, which has no hint", async () => {
      const error = new AtiumError("CONFIG_NOT_FOUND", 'Config file "x.ts" was not found.');
      const options = fakeRun(["probe"], { commands: [probe(error)] });

      expect(await run(options)).toBe(2);
      expect(options.stderr.text).toBe('Config file "x.ts" was not found.\n');
    });

    it("logs the error details too with --verbose", async () => {
      const options = fakeRun(["probe", "--verbose"], { commands: [probe(configError)] });

      expect(await run(options)).toBe(2);
      expect(options.stderr.text).toContain("atium:cli debug Error details");
      expect(options.stderr.text).toContain('"stack"');
    });
  });

  describe("internal errors", () => {
    const internalErrors: readonly [string, Error][] = [
      ["a plain Error", new Error("boom")],
      ["an AtiumError that is not about the config", new AtiumError("STORAGE_UNAVAILABLE", "boom")],
    ];

    it.each(internalErrors)(
      "exit with 0 and a warning without --strict, on %s",
      async (_case, error) => {
        const options = fakeRun(["probe"], { commands: [probe(error)] });

        expect(await run(options)).toBe(0);
        expect(options.stderr.text).toContain(
          "atium:cli error atium probe failed because of an internal error; exiting with code 0",
        );
        expect(options.stderr.text).toContain("Pass --strict to exit with code 3.");
        expect(options.stderr.text).toContain('"message":"boom"');
        expect(options.stdout.text).toBe("");
      },
    );

    it.each(internalErrors)("exit with 3 with --strict, on %s", async (_case, error) => {
      const options = fakeRun(["probe", "--strict"], { commands: [probe(error)] });

      expect(await run(options)).toBe(3);
      expect(options.stderr.text).toContain(
        "atium:cli error atium probe failed because of an internal error; exiting with code 3 because of --strict.",
      );
    });

    it("accept --strict before the command name", async () => {
      const options = fakeRun(["--strict", "probe"], { commands: [probe(new Error("boom"))] });

      expect(await run(options)).toBe(3);
    });

    it("still show the warning with --quiet", async () => {
      const options = fakeRun(["probe", "--quiet"], { commands: [probe(new Error("boom"))] });

      expect(await run(options)).toBe(0);
      expect(options.stderr.text).toContain("failed because of an internal error");
    });

    it("include the stack only with --verbose", async () => {
      const quiet = fakeRun(["probe"], { commands: [probe(new Error("boom"))] });
      const verbose = fakeRun(["probe", "--verbose"], { commands: [probe(new Error("boom"))] });

      await run(quiet);
      await run(verbose);

      expect(quiet.stderr.text).not.toContain('"stack"');
      expect(verbose.stderr.text).toContain('"stack"');
    });
  });

  describe("output safety", () => {
    it("redacts secrets and escapes control characters in a usage error", async () => {
      const error = new UsageError(
        "Cannot use Bearer abc123secret here.\u001b[2J",
        "Remove the \u009b token.",
      );
      const options = fakeRun(["probe"], { commands: [probe(error)] });

      expect(await run(options)).toBe(2);
      expect(options.stderr.text).not.toContain("abc123secret");
      expect(options.stderr.text).toContain("\\u001b[2J");
      expect(options.stderr.text).toContain("\\u009b");
      expect(options.stderr.text).not.toContain("\u001b");
    });

    it("escapes control characters that Commander repeats from the arguments", async () => {
      const options = fakeRun(["--\u001b[2J"]);

      expect(await run(options)).toBe(2);
      expect(options.stderr.text).toContain("\\u001b[2J");
      expect(options.stderr.text).not.toContain("\u001b");
    });
  });

  describe("when the error cannot be reported", () => {
    /** An error whose inspection throws, so the report itself fails. */
    function hostileError(): Error {
      return new Proxy(new Error("boom"), {
        has: () => {
          throw new Error("trap");
        },
      });
    }

    it.each([
      [[], 0],
      [["--strict"], 3],
    ])("still exits with the code of an internal error, with the flags %j", async (flags, code) => {
      const options = fakeRun(["probe", ...flags], { commands: [probe(hostileError())] });

      expect(await run(options)).toBe(code);
      expect(options.stderr.text).toContain("atium probe failed because of an internal error");
    });

    it("still exits with 2 on a usage error when stderr fails", async () => {
      const options = fakeRun(["probe"], {
        commands: [probe(new UsageError("Cannot do that.", "Do this instead."))],
      });
      options.stderr.write = () => {
        throw new Error("EPIPE");
      };

      expect(await run(options)).toBe(2);
    });

    it("still exits when stderr fails as well", async () => {
      const options = fakeRun(["probe", "--strict"], { commands: [probe(hostileError())] });
      options.stderr.write = () => {
        throw new Error("EPIPE");
      };

      expect(await run(options)).toBe(3);
    });
  });

  describe("global options", () => {
    it("reach the command, typed", async () => {
      const { command, contexts } = recorder();
      const argv = [
        "probe",
        "--config",
        "a.ts",
        "--format",
        "json",
        "--output",
        "out.json",
        "--ci",
        "--strict",
      ];

      expect(await run(fakeRun(argv, { commands: [command] }))).toBe(0);
      expect(contexts[0]?.globals).toEqual({
        config: "a.ts",
        format: "json",
        output: "out.json",
        ci: true,
        strict: true,
      });
    });

    it("default to off", async () => {
      const { command, contexts } = recorder();

      await run(fakeRun(["probe"], { commands: [command], cwd: "/somewhere" }));

      expect(contexts[0]?.globals).toEqual({ ci: false, strict: false });
      expect(contexts[0]?.cwd).toBe("/somewhere");
    });

    it.each([
      ["--quiet", "error"],
      ["--verbose", "debug"],
    ])("map %s to the log level %s", async (flag, logLevel) => {
      const { command, contexts } = recorder();

      await run(fakeRun(["probe", flag], { commands: [command] }));

      expect(contexts[0]?.globals.logLevel).toBe(logLevel);
    });
  });
});
