import { toolRepository } from "../repositories/tool-repository";

export class ToolService {
  listTools() {
    return toolRepository.list();
  }
}

export const toolService = new ToolService();
