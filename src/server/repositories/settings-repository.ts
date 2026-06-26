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
  };
};

export class SettingsRepository {
  get(): ApiSettings {
    return {
      workspaceName: "GPT Omni Agents Demo",
      defaultEnvironment: "development",
      region: "local",
      storageMode: "sqlite",
      apiVersion: "v1",
      guardrails: {
        piiRedaction: true,
        promptInjectionGuard: true,
        toolAllowList: true,
      },
    };
  }
}

export const settingsRepository = new SettingsRepository();
