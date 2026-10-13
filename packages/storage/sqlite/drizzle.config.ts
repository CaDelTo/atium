import { defineConfig } from "drizzle-kit";

// `pnpm db:generate` writes the migration for a change in `src/schema.ts`.
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/schema.ts",
  out: "./drizzle",
});
