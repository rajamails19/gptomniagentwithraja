import { z } from "zod";
import type { RegisteredTool, ToolCategory } from "../tools/types";
import { mcpRegistry } from "./MCPRegistry";
import type { MCPToolDefinition } from "./types";

export class MCPToolAdapter implements RegisteredTool {
  id: string;
  name: string;
  description: string;
  category: ToolCategory = "mcp";
  inputSchema: z.ZodTypeAny;
  outputSchema: z.ZodTypeAny;
  originServer: string;
  origin: { type: "mcp"; serverId: string };

  constructor(tool: MCPToolDefinition) {
    this.id = tool.id;
    this.name = tool.name;
    this.description = tool.description;
    this.inputSchema = tool.inputSchema;
    this.outputSchema = tool.outputSchema;
    this.originServer = tool.serverId;
    this.origin = { type: "mcp" as const, serverId: tool.serverId };
  }

  async execute(input: unknown) {
    const parsed = this.inputSchema.parse(input);
    const result = await mcpRegistry.execute(this.id, parsed);
    return this.outputSchema.parse(result.output);
  }
}
