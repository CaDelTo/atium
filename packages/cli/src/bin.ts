import { run } from "./run.js";

process.exitCode = await run({
  argv: process.argv.slice(2),
  cwd: process.cwd(),
  env: process.env,
  stdout: process.stdout,
  stderr: process.stderr,
});
