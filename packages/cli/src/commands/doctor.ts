import { HELP } from "../messages.js";
import type { CliCommand } from "./command.js";

/** `atium doctor`: checks that Atium can run in the project (18-cli-config.md §26.1). */
export const doctorCommand: CliCommand = {
  name: "doctor",
  description: HELP.doctor.description,
  run: async (context) => {
    const { runDoctor } = await import("../doctor/run-doctor.js");
    await runDoctor(context, { nodeVersion: process.versions.node });
  },
};
