import { DEMO_SCENARIOS } from "@/lib/demo/seed-data";
import type { Agent } from "@/lib/demo/types";

export class AgentRepository {
  list(): Agent[] {
    const agents = new Map<string, Agent>();
    DEMO_SCENARIOS.forEach((scenario) => {
      scenario.agents.forEach((agent) => agents.set(agent.id, agent));
    });
    return Array.from(agents.values());
  }
}

export const agentRepository = new AgentRepository();
