const TEST_FILE = "\\.test\\.ts$";

/** @type {import("dependency-cruiser").IConfiguration} */
module.exports = {
  forbidden: [
    { name: "no-circular", severity: "error", from: {}, to: { circular: true } },
    {
      // An unresolved import would slip past every layer rule, so it fails on its own.
      name: "not-to-unresolvable",
      severity: "error",
      from: {},
      to: { couldNotResolve: true },
    },
    {
      name: "core-is-independent",
      severity: "error",
      from: { path: "^packages/core/" },
      to: { path: "^packages/(?!core/)" },
    },
    {
      name: "analyzers-are-isolated",
      severity: "error",
      from: { path: "^packages/analyzers/([^/]+)/" },
      to: { path: "^packages/analyzers/", pathNot: "^packages/analyzers/$1/" },
    },
    {
      name: "analyzers-no-io-packages",
      severity: "error",
      from: { path: "^packages/analyzers/" },
      to: { path: "^packages/(adapters|storage|reporters|cli)/" },
    },
    {
      name: "adapters-no-analyzers",
      severity: "error",
      from: { path: "^packages/adapters/" },
      to: { path: "^packages/(analyzers|storage|cli)/" },
    },
    {
      // ADR-0023: the editor loads `@atium/core/pure`, so its graph never reaches
      // configuration, CI detection, storage, the logger or Node modules with I/O.
      name: "core-pure-has-no-io",
      severity: "error",
      // Its tests compare it with the root, so they may import it.
      from: { path: "^packages/core/src/pure/", pathNot: TEST_FILE },
      to: {
        reachable: true,
        path: [
          "^packages/core/src/(config|ci|storage)/",
          "^packages/core/src/(stderr-logger|fail-open|env)\\.ts$",
          "^(node:)?(fs|fs/promises|child_process|net|http|https|zlib|os|worker_threads)$",
        ],
      },
    },
    {
      // ADR-0023: the plugin imports only `@atium/core/pure` from other packages;
      // its tests may also use `@atium/core/testing`.
      name: "eslint-plugin-only-core-pure",
      severity: "error",
      from: { path: "^packages/eslint-plugin/", pathNot: TEST_FILE },
      to: { path: "^packages/(?!eslint-plugin/)", pathNot: "^packages/core/dist/pure/" },
    },
    {
      name: "no-test-code-in-src",
      severity: "error",
      // Covers packages/<name>/src and nested ones such as packages/analyzers/<name>/src.
      from: {
        path: "^packages/([^/]+|(adapters|analyzers|storage|reporters)/[^/]+)/src/",
        pathNot: TEST_FILE,
      },
      to: { path: TEST_FILE },
    },
  ],
  options: {
    tsConfig: { fileName: "tsconfig.base.json" },
    // Workspace packages resolve to their built `dist/` through `exports`: keep those
    // files in the graph as targets so the layer rules see them, but do not cruise them.
    doNotFollow: { path: ["node_modules", "(^|/)dist/"] },
    exclude: { path: "(^|/)(coverage|node_modules)/" },
    // Resolve workspace packages through their `exports` like Node does.
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
      mainFields: ["module", "main", "types", "typings"],
    },
  },
};
