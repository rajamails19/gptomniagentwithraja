import { toolExecutionRepository } from "../repositories/tool-execution-repository";
import { toolExecutor } from "../tools/ToolExecutor";
import { toolRegistry } from "../tools/ToolRegistry";

export class ToolService {
  listTools() {
    return toolRegistry.list();
  }

  getTool(id: string) {
    const tool = toolRegistry.get(id);
    return {
      id: tool.id,
      name: tool.name,
      description: tool.description,
      category: tool.category,
      inputSchema: tool.inputSchema.describe(tool.name)._def.typeName,
      outputSchema: tool.outputSchema.describe(tool.name)._def.typeName,
    };
  }

  executeTool(
    id: string,
    input: unknown,
    context: {
      runId?: string;
      traceEventId?: string;
    } = {},
  ) {
    return toolExecutor.execute(id, input, context);
  }

  listRecentExecutions() {
    return toolExecutionRepository.listRecent();
  }
}

export const toolService = new ToolService();
