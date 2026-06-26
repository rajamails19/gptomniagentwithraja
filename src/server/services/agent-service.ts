import { agentRepository } from "../repositories/agent-repository";

export class AgentService {
  listAgents() {
    return agentRepository.list();
  }
}

export const agentService = new AgentService();
