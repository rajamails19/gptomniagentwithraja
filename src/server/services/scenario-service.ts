import type { ApiScenario } from "@/lib/api/schemas";
import { toApiScenario } from "../models/mappers";
import { scenarioRepository } from "../repositories/scenario-repository";
import { notFound } from "../utils/errors";

export class ScenarioService {
  listScenarios(): ApiScenario[] {
    return scenarioRepository.list().map(toApiScenario);
  }

  getScenario(id: string): ApiScenario {
    const scenario = scenarioRepository.findById(id);
    if (!scenario) throw notFound("Scenario not found");
    return toApiScenario(scenario);
  }
}

export const scenarioService = new ScenarioService();
