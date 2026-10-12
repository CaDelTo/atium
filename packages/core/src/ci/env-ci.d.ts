// env-ci ships no type declarations. Its result is validated with Zod in
// env-ci-fallback.ts, so it is typed as `unknown` here.
declare module "env-ci" {
  /** Detects the CI service from `env`; may run `git` in `cwd`. */
  function envCi(options: {
    env: Readonly<Record<string, string | undefined>>;
    cwd: string;
  }): unknown;
  export { envCi as default };
}
