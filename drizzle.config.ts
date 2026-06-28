import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.OMNIAGENTS_SQLITE_PATH ?? ".data/omniagents.sqlite",
  },
});
