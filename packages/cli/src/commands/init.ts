import { HELP } from "../messages.js";
import type { CliCommand } from "./command.js";

/** `atium init`: creates `atium.config.ts` (18-cli-config.md §26.1). */
export const initCommand: CliCommand = {
  name: "init",
  description: HELP.init.description,
  configure: (command) => {
    command.option("--force", HELP.init.force);
  },
  run: async (context, options) => {
    const { runInit } = await import("../init/run-init.js");
    await runInit(context, { force: options["force"] === true });
  },
};
