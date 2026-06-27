import { DEMO_SCENARIOS } from "@/lib/demo/seed-data";
import { getDatabaseStatus, initializeDatabase } from "../db";
import { llmService } from "../llm/LLMService";
import { runRepository } from "../repositories/run-repository";

export class HealthService {
  async getHealth() {
    initializeDatabase();
    const database = getDatabaseStatus();
    const llmHealth = await llmService.health();
    const llmConfig = llmService.getConfiguration();
    return {
      ok: true,
      service: "GPT Omni Agents API",
      version: "v1",
      mode: "database",
      scenarioCount: DEMO_SCENARIOS.length,
      runCount: runRepository.count(),
      database,
      llm: {
        provider: llmHealth.provider,
        model: llmConfig.model,
        configured: llmHealth.configured,
        reachable: llmHealth.reachable,
        status: llmHealth.status,
        message: llmHealth.message,
      },
      timestamp: new Date().toISOString(),
    };
  }
}

export const healthService = new HealthService();
