import { DEMO_SCENARIOS } from "@/lib/demo/seed-data";
import { runRepository } from "../repositories/run-repository";

export class HealthService {
  getHealth() {
    return {
      ok: true,
      service: "GPT Omni Agents API",
      version: "v1",
      mode: "in-memory",
      scenarioCount: DEMO_SCENARIOS.length,
      runCount: runRepository.count(),
      timestamp: new Date().toISOString(),
    };
  }
}

export const healthService = new HealthService();
