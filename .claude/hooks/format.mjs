#!/usr/bin/env node
// PostToolUse hook: formats the file Claude just edited with Prettier.
// Best-effort by design: it must never block or fail the agent's work.
import { execFileSync } from "node:child_process";

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  input += chunk;
});
process.stdin.on("end", () => {
  try {
    const filePath = JSON.parse(input)?.tool_input?.file_path;
    if (typeof filePath === "string" && filePath.length > 0) {
      execFileSync("pnpm", ["exec", "prettier", "--write", "--ignore-unknown", filePath], {
        stdio: "ignore",
        timeout: 15_000,
      });
    }
  } catch (error) {
    process.stderr.write(`format hook skipped: ${error instanceof Error ? error.message : String(error)}\n`);
  }
  process.exit(0);
});
