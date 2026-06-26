import { DEFAULT_SCENARIO_ID, DEMO_SCENARIOS, getDemoScenario } from "@/lib/demo/seed-data";
import type { DemoScenario } from "@/lib/demo/types";

export class ScenarioRepository {
  list(): DemoScenario[] {
    return DEMO_SCENARIOS;
  }

  findById(id: string): DemoScenario | undefined {
    return DEMO_SCENARIOS.find((scenario) => scenario.id === id);
  }

  getDefault(): DemoScenario {
    return getDemoScenario(DEFAULT_SCENARIO_ID);
  }
}

export const scenarioRepository = new ScenarioRepository();
