import { notFound } from "../utils/errors";
import type { AgentDefinition } from "./ExecutionState";
import { DeveloperAgent } from "./agents/DeveloperAgent";
import { DocumentationAgent } from "./agents/DocumentationAgent";
import { PlannerAgent } from "./agents/PlannerAgent";
import { QAAgent } from "./agents/QAAgent";
import { ResearchAgent } from "./agents/ResearchAgent";
import { ReviewerAgent } from "./agents/ReviewerAgent";

export class AgentRegistry {
  private agents = new Map<string, AgentDefinition>();

  constructor() {
    [
      new PlannerAgent(),
      new ResearchAgent(),
      new DeveloperAgent(),
      new DocumentationAgent(),
      new QAAgent(),
      new ReviewerAgent(),
    ].forEach((agent) => this.register(agent));
  }

  register(agent: AgentDefinition) {
    this.agents.set(agent.id, agent);
  }

  get(id: string) {
    const agent = this.agents.get(id);
    if (!agent) throw notFound(`Agent not registered: ${id}`);
    return agent;
  }

  list() {
    return Array.from(this.agents.values()).map((agent) => ({
      id: agent.id,
      name: agent.name,
      role: agent.role,
      systemPrompt: agent.systemPrompt,
      allowedTools: agent.allowedTools,
      allowedModels: agent.allowedModels,
      health: agent.health(),
    }));
  }
}

export const agentRegistry = new AgentRegistry();
