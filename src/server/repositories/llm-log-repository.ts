import { desc } from "drizzle-orm";

import { db } from "../db/connection";
import { initializeDatabase } from "../db";
import { llmLogsTable } from "../db/schema";

export type CreateLlmLog = {
  executionId?: string;
  provider: string;
  model: string;
  prompt: string;
  response: string;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  status: "success" | "error";
  errorMessage?: string;
};

export class LlmLogRepository {
  create(log: CreateLlmLog) {
    initializeDatabase();
    const createdAt = new Date().toISOString();
    const id = `llm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

    db.insert(llmLogsTable)
      .values({
        id,
        executionId: log.executionId ?? null,
        provider: log.provider,
        model: log.model,
        prompt: log.prompt,
        response: log.response,
        latencyMs: log.latencyMs,
        inputTokens: log.inputTokens ?? null,
        outputTokens: log.outputTokens ?? null,
        totalTokens: log.totalTokens ?? null,
        status: log.status,
        errorMessage: log.errorMessage ?? null,
        createdAt,
      })
      .run();

    return id;
  }

  listRecent(limit = 20) {
    initializeDatabase();
    return db.select().from(llmLogsTable).orderBy(desc(llmLogsTable.createdAt)).limit(limit).all();
  }
}

export const llmLogRepository = new LlmLogRepository();
