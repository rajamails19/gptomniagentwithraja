import { type ApiSettings, settingsRepository } from "../repositories/settings-repository";

export class SettingsService {
  getSettings() {
    return settingsRepository.get();
  }

  updateSettings(patch: Partial<ApiSettings>) {
    return settingsRepository.update(patch);
  }
}

export const settingsService = new SettingsService();
