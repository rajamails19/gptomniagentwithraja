import { mcpServer } from "../mcp/MCPServer";
import { toolExecutionRepository } from "../repositories/tool-execution-repository";
import { toolExecutor } from "../tools/ToolExecutor";
import { toolRegistry } from "../tools/ToolRegistry";

export class ToolService {
  async listTools() {
    await mcpServer.initialize();
    return toolRegistry.list();
  }

  async getTool(id: string) {
    await mcpServer.initialize();
    const tool = toolRegistry.get(id);
    return {
      id: tool.id,
      name: tool.name,
      description: tool.description,
      category: tool.category,
      inputSchema: tool.inputSchema.describe(tool.name)._def.typeName,
      outputSchema: tool.outputSchema.describe(tool.name)._def.typeName,
      origin: tool.origin ?? { type: "local" },
    };
  }

  async executeTool(
    id: string,
    input: unknown,
    context: {
      runId?: string;
      traceEventId?: string;
    } = {},
  ) {
    await mcpServer.initialize();
    return toolExecutor.execute(id, input, context);
  }

  listRecentExecutions() {
    return toolExecutionRepository.listRecent();
  }
}

export const toolService = new ToolService();
