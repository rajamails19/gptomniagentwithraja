import type { LLMConfig, LLMProviderName } from "../types";

const provider = (process.env.LLM_PROVIDER ?? "openai") as LLMProviderName;

export const llmConfig: LLMConfig = {
  provider,
  model: process.env.LLM_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-5-mini",
  embeddingModel: process.env.LLM_EMBEDDING_MODEL ?? "text-embedding-3-small",
  timeoutMs: Number(process.env.LLM_TIMEOUT_MS ?? 20_000),
};

export const supportedModelHints = {
  openai: ["gpt-5", "gpt-5-mini"],
  anthropic: ["claude"],
  gemini: ["gemini"],
  llama: ["llama"],
  deepseek: ["deepseek"],
} satisfies Record<LLMProviderName, string[]>;
