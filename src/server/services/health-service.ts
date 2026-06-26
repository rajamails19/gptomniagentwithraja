import { DEMO_SCENARIOS } from "@/lib/demo/seed-data";
import { getDatabaseStatus, initializeDatabase } from "../db";
import { runRepository } from "../repositories/run-repository";

export class HealthService {
  getHealth() {
    initializeDatabase();
    const database = getDatabaseStatus();
    return {
      ok: true,
      service: "GPT Omni Agents API",
      version: "v1",
      mode: "database",
      scenarioCount: DEMO_SCENARIOS.length,
      runCount: runRepository.count(),
      database,
      timestamp: new Date().toISOString(),
    };
  }
}

export const healthService = new HealthService();
