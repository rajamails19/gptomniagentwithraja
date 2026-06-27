import type { LLMProviderName } from "./types";
import { BaseProvider } from "./BaseProvider";
import { OpenAIProvider } from "./providers/OpenAIProvider";

export class ProviderRegistry {
  private providers = new Map<LLMProviderName, BaseProvider>();

  constructor() {
    this.register(new OpenAIProvider());
  }

  register(provider: BaseProvider) {
    this.providers.set(provider.name, provider);
  }

  get(providerName: LLMProviderName) {
    return this.providers.get(providerName);
  }

  list() {
    return Array.from(this.providers.values());
  }
}

export const providerRegistry = new ProviderRegistry();
