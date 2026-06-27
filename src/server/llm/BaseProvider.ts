import type {
  LLMEmbedRequest,
  LLMEmbedResult,
  LLMGenerateRequest,
  LLMGenerateResult,
  LLMModelInfo,
  LLMProviderHealth,
  LLMProviderName,
} from "./types";

export abstract class BaseProvider {
  abstract name: LLMProviderName;

  abstract generate(request: LLMGenerateRequest): Promise<LLMGenerateResult>;

  abstract embed(request: LLMEmbedRequest): Promise<LLMEmbedResult>;

  abstract health(): Promise<LLMProviderHealth>;

  abstract listModels(): Promise<LLMModelInfo[]>;

  async *stream(request: LLMGenerateRequest): AsyncIterable<string> {
    const result = await this.generate(request);
    yield result.text;
  }
}
