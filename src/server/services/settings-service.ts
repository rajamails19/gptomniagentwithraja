import { settingsRepository } from "../repositories/settings-repository";

export class SettingsService {
  getSettings() {
    return settingsRepository.get();
  }
}

export const settingsService = new SettingsService();
