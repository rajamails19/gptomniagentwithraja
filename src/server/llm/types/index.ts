export type LLMProviderName = "openai" | "anthropic" | "gemini" | "llama" | "deepseek";

export type LLMMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type LLMGenerateRequest = {
  prompt: string;
  system?: string;
  model?: string;
  temperature?: number;
  executionId?: string;
  metadata?: Record<string, string>;
};

export type LLMGenerateResult = {
  text: string;
  provider: LLMProviderName;
  model: string;
  latencyMs: number;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
  rawId?: string;
};

export type LLMEmbedRequest = {
  input: string | string[];
  model?: string;
};

export type LLMEmbedResult = {
  embeddings: number[][];
  provider: LLMProviderName;
  model: string;
  usage?: {
    totalTokens?: number;
  };
};

export type LLMProviderHealth = {
  provider: LLMProviderName;
  configured: boolean;
  reachable: boolean;
  status: "ok" | "not_configured" | "unavailable" | "error";
  message: string;
};

export type LLMModelInfo = {
  id: string;
  provider: LLMProviderName;
  label?: string;
};

export type LLMConfig = {
  provider: LLMProviderName;
  model: string;
  embeddingModel: string;
  timeoutMs: number;
};
