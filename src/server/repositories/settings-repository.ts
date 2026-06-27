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
      workspaceName: "OmniAgents Demo",
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
