import { getDatabasePath, pingDatabase } from "./connection";
import { runMigrations } from "./migrate";
import { getSeedStatus, seedDatabaseIfNeeded } from "./seed";

let initialized = false;

export function initializeDatabase() {
  if (!initialized) {
    runMigrations();
    seedDatabaseIfNeeded();
    initialized = true;
  }

  return getDatabaseStatus();
}

export function getDatabaseStatus() {
  const seed = getSeedStatus();
  return {
    connected: pingDatabase(),
    storageType: "sqlite" as const,
    path: getDatabasePath(),
    migrations: "applied" as const,
    seed,
  };
}
