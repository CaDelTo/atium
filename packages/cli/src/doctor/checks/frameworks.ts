import type { Logger } from "@atium/core";
import { DOCTOR, ERRORS } from "../../messages.js";
import { manifestProblem, readProjectManifest } from "../../project/manifest.js";
import type { DoctorCheckOf } from "../report.js";

/**
 * The `frameworks` check: the test frameworks in `package.json`, detected as
 * `atium init` does (18-cli-config.md §26.1).
 *
 * @param cwd - Working directory, absolute.
 * @param logger - Receives the read or JSON error, at debug level.
 * @returns `pass` with the adapters detected, or `warn` if there is none or
 * `package.json` cannot be used, with the error code of a read error. It
 * never fails: Atium can still run, for example on JUnit or CTRF reports.
 */
export async function checkFrameworks(
  cwd: string,
  logger: Logger,
): Promise<DoctorCheckOf<"frameworks">> {
  const read = await readProjectManifest(cwd);
  if (read.kind === "detected") {
    const adapters = [...read.project.adapters];
    return adapters.length === 0
      ? warning(DOCTOR.frameworks.none, DOCTOR.frameworks.noneHint)
      : {
          id: "frameworks",
          status: "pass",
          message: DOCTOR.frameworks.detected(adapters),
          details: { adapters },
        };
  }
  const { message, code, error } = manifestProblem(read);
  if (error !== undefined) {
    logger.debug(ERRORS.details, { error });
  }
  return warning(
    code === undefined ? message : DOCTOR.frameworks.withCode(message, code),
    DOCTOR.frameworks.manifestHint,
  );
}

function warning(message: string, hint: string): DoctorCheckOf<"frameworks"> {
  return { id: "frameworks", status: "warn", message, hint, details: { adapters: [] } };
}
