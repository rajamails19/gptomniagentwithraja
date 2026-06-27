import { llmConfig } from "./models/config";
import { providerRegistry } from "./ProviderRegistry";
import type { LLMGenerateRequest, LLMGenerateResult, LLMProviderHealth } from "./types";
import { badRequest, providerUnavailable } from "../utils/errors";
import { llmLogRepository } from "../repositories/llm-log-repository";

export class LLMService {
  getActiveProvider() {
    const provider = providerRegistry.get(llmConfig.provider);
    if (!provider) throw badRequest(`LLM provider is not registered: ${llmConfig.provider}`);
    return provider;
  }

  getConfiguration() {
    return {
      provider: llmConfig.provider,
      model: llmConfig.model,
      embeddingModel: llmConfig.embeddingModel,
      timeoutMs: llmConfig.timeoutMs,
    };
  }

  async generate(request: LLMGenerateRequest): Promise<LLMGenerateResult> {
    const provider = this.getActiveProvider();
    const started = performance.now();
    const model = request.model ?? llmConfig.model;

    try {
      const result = await provider.generate(request);
      llmLogRepository.create({
        executionId: request.executionId,
        provider: result.provider,
        model: result.model,
        prompt: request.prompt,
        response: result.text,
        latencyMs: result.latencyMs,
        inputTokens: result.usage?.inputTokens,
        outputTokens: result.usage?.outputTokens,
        totalTokens: result.usage?.totalTokens,
        status: "success",
      });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "LLM request failed.";
      llmLogRepository.create({
        executionId: request.executionId,
        provider: llmConfig.provider,
        model,
        prompt: request.prompt,
        response: "",
        latencyMs: Math.round(performance.now() - started),
        status: "error",
        errorMessage: message,
      });
      throw providerUnavailable(toFriendlyLlmError(message));
    }
  }

  async health(): Promise<LLMProviderHealth> {
    return this.getActiveProvider().health();
  }

  async listModels() {
    return this.getActiveProvider().listModels();
  }
}

export const llmService = new LLMService();

function toFriendlyLlmError(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("not configured") || normalized.includes("api_key")) {
    return "LLM provider is not configured. Set OPENAI_API_KEY and retry.";
  }
  if (normalized.includes("rate limit") || normalized.includes("429")) {
    return "LLM provider rate limit reached. Retry later.";
  }
  if (normalized.includes("timeout")) {
    return "LLM provider request timed out.";
  }
  if (normalized.includes("network") || normalized.includes("connection")) {
    return "Network failure reaching the LLM provider.";
  }
  return message;
}
