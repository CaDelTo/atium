import { z } from "zod";
import { CONFIG_PACKAGE, FRAMEWORK_PACKAGES } from "../defaults.js";

/** Name of an adapter that `atium init` can detect. */
type AdapterName = (typeof FRAMEWORK_PACKAGES)[number]["adapter"];

/** What `atium init` learns from `package.json`. */
export interface DetectedProject {
  /** Adapters whose framework is a dependency, in the order of {@link FRAMEWORK_PACKAGES}. */
  readonly adapters: readonly AdapterName[];
  /** Whether `@atium/core`, which the config imports, is a dependency. */
  readonly hasConfigPackage: boolean;
}

const DependenciesSchema = z.record(z.string(), z.unknown()).optional();

/** The parts of `package.json` that matter here; any other key is allowed. */
const ManifestSchema = z.looseObject({
  dependencies: DependenciesSchema,
  devDependencies: DependenciesSchema,
  peerDependencies: DependenciesSchema,
});

/**
 * Detects the test frameworks of a project from its `package.json`: an
 * adapter is added when one of its {@link FRAMEWORK_PACKAGES} appears in
 * `dependencies`, `devDependencies` or `peerDependencies`, whatever version.
 *
 * @param manifest - The parsed `package.json`, not validated yet.
 * @returns What was detected, or `undefined` if the value is not an object or
 * one of those keys is not an object.
 */
export function detectFrameworks(manifest: unknown): DetectedProject | undefined {
  const parsed = ManifestSchema.safeParse(manifest);
  if (!parsed.success) {
    return undefined;
  }
  const { dependencies, devDependencies, peerDependencies } = parsed.data;
  const names = new Set(
    [dependencies, devDependencies, peerDependencies].flatMap((group) =>
      group === undefined ? [] : Object.keys(group),
    ),
  );
  return {
    adapters: FRAMEWORK_PACKAGES.filter(({ packages }) =>
      packages.some((name) => names.has(name)),
    ).map(({ adapter }) => adapter),
    hasConfigPackage: names.has(CONFIG_PACKAGE),
  };
}
