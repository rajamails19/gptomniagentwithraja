import { db } from "../db/connection";
import { settingsTable } from "../db/schema";

export type ApiSettings = {
  workspaceName: string;
  defaultEnvironment: string;
  region: string;
  storageMode: "sqlite";
  apiVersion: string;
  guardrails: {
    piiRedaction: boolean;
    promptInjectionGuard: boolean;
    toolAllowList: boolean;
    autoCostCap: boolean;
  };
};

const DEFAULTS: ApiSettings = {
  workspaceName: "OmniAgents Demo",
  defaultEnvironment: "development",
  region: "local",
  storageMode: "sqlite",
  apiVersion: "v1",
  guardrails: {
    piiRedaction: true,
    promptInjectionGuard: true,
    toolAllowList: true,
    autoCostCap: false,
  },
};

export class SettingsRepository {
  get(): ApiSettings {
    try {
      const row = db.select().from(settingsTable).all().find((r) => r.key === "workspace");
      if (!row) return DEFAULTS;
      const parsed = JSON.parse(row.valueJson) as Partial<ApiSettings>;
      return {
        ...DEFAULTS,
        ...parsed,
        guardrails: { ...DEFAULTS.guardrails, ...(parsed.guardrails ?? {}) },
      };
    } catch {
      return DEFAULTS;
    }
  }

  update(patch: Partial<ApiSettings>): ApiSettings {
    const current = this.get();
    const next: ApiSettings = {
      ...current,
      ...patch,
      guardrails: {
        ...current.guardrails,
        ...(patch.guardrails ?? {}),
      },
      // these fields are read-only
      storageMode: "sqlite",
      apiVersion: "v1",
    };

    const now = new Date().toISOString();
    db.insert(settingsTable)
      .values({ key: "workspace", valueJson: JSON.stringify(next), updatedAt: now })
      .onConflictDoUpdate({
        target: settingsTable.key,
        set: { valueJson: JSON.stringify(next), updatedAt: now },
      })
      .run();

    return next;
  }
}

export const settingsRepository = new SettingsRepository();
