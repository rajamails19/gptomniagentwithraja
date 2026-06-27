import OpenAI from "openai";

import { BaseProvider } from "../BaseProvider";
import { llmConfig } from "../models/config";
import type {
  LLMEmbedRequest,
  LLMEmbedResult,
  LLMGenerateRequest,
  LLMGenerateResult,
  LLMModelInfo,
  LLMProviderHealth,
  LLMProviderName,
} from "../types";

export class OpenAIProvider extends BaseProvider {
  name: LLMProviderName = "openai";

  private get apiKey() {
    return process.env.OPENAI_API_KEY;
  }

  private get client() {
    if (!this.apiKey) return null;
    return new OpenAI({
      apiKey: this.apiKey,
      timeout: llmConfig.timeoutMs,
    });
  }

  async generate(request: LLMGenerateRequest): Promise<LLMGenerateResult> {
    const client = this.client;
    if (!client) throw new Error("OpenAI provider is not configured. Set OPENAI_API_KEY.");

    const started = performance.now();
    const model = request.model ?? llmConfig.model;
    const input = request.system
      ? [
          { role: "system" as const, content: request.system },
          { role: "user" as const, content: request.prompt },
        ]
      : request.prompt;

    const response = await client.responses.create({
      model,
      input,
      ...(typeof request.temperature === "number" ? { temperature: request.temperature } : {}),
    });

    return {
      text: response.output_text,
      provider: this.name,
      model,
      latencyMs: Math.round(performance.now() - started),
      usage: {
        inputTokens: response.usage?.input_tokens,
        outputTokens: response.usage?.output_tokens,
        totalTokens: response.usage?.total_tokens,
      },
      rawId: response.id,
    };
  }

  async embed(request: LLMEmbedRequest): Promise<LLMEmbedResult> {
    const client = this.client;
    if (!client) throw new Error("OpenAI provider is not configured. Set OPENAI_API_KEY.");

    const model = request.model ?? llmConfig.embeddingModel;
    const response = await client.embeddings.create({
      model,
      input: request.input,
    });

    return {
      embeddings: response.data.map((item) => item.embedding),
      provider: this.name,
      model,
      usage: {
        totalTokens: response.usage?.total_tokens,
      },
    };
  }

  async health(): Promise<LLMProviderHealth> {
    if (!this.apiKey) {
      return {
        provider: this.name,
        configured: false,
        reachable: false,
        status: "not_configured",
        message: "OPENAI_API_KEY is not configured.",
      };
    }

    try {
      await this.listModels();
      return {
        provider: this.name,
        configured: true,
        reachable: true,
        status: "ok",
        message: "OpenAI API is reachable.",
      };
    } catch (error) {
      return {
        provider: this.name,
        configured: true,
        reachable: false,
        status: "unavailable",
        message: toFriendlyOpenAIError(error),
      };
    }
  }

  async listModels(): Promise<LLMModelInfo[]> {
    const client = this.client;
    if (!client) return [];

    const response = await client.models.list();
    return response.data.slice(0, 30).map((model) => ({
      id: model.id,
      provider: this.name,
    }));
  }
}

export function toFriendlyOpenAIError(error: unknown) {
  if (error instanceof OpenAI.APIError) {
    if (error.status === 401) return "OpenAI rejected the API key.";
    if (error.status === 429) return "OpenAI rate limit reached. Retry later or use a lower load.";
    if (error.status && error.status >= 500) return "OpenAI service is temporarily unavailable.";
    return error.message;
  }

  if (error instanceof Error) {
    if (error.name === "APIConnectionTimeoutError") return "OpenAI request timed out.";
    if (error.message.toLowerCase().includes("network")) return "Network failure reaching OpenAI.";
    return error.message;
  }

  return "Provider unavailable.";
}
