import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import * as schema from "./schema";

const defaultDatabasePath = process.env.VERCEL
  ? join(tmpdir(), "omniagents.sqlite")
  : join(process.cwd(), ".data", "omniagents.sqlite");
const databasePath = process.env.OMNIAGENTS_SQLITE_PATH ?? defaultDatabasePath;

mkdirSync(dirname(databasePath), { recursive: true });

export const sqlite = new Database(databasePath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

export function getDatabasePath() {
  return databasePath;
}

export function pingDatabase() {
  const result = sqlite.prepare("select 1 as ok").get() as { ok: number };
  return result.ok === 1;
}
