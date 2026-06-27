import { toolRegistry } from "../tools/ToolRegistry";
import { MCPToolAdapter } from "./MCPToolAdapter";
import { mcpRegistry } from "./MCPRegistry";

let initialized = false;

export class MCPServerFacade {
  async initialize() {
    if (initialized) return;
    await mcpRegistry.initialize();
    this.registerDiscoveredTools();
    initialized = true;
  }

  getOverview() {
    const servers = mcpRegistry.listServers();
    const tools = mcpRegistry.listTools();
    return {
      status: servers.some((server) => server.status === "connected")
        ? "connected"
        : "disconnected",
      connectedServers: servers.filter((server) => server.status === "connected").length,
      availableTools: tools.length,
      servers,
      tools,
      recentCalls: mcpRegistry.listCalls(),
    };
  }

  async connect(id: string) {
    const server = await mcpRegistry.connect(id);
    this.registerDiscoveredTools();
    return server;
  }

  async disconnect(id: string) {
    const server = await mcpRegistry.disconnect(id);
    toolRegistry.unregisterOrigin("mcp", id);
    return server;
  }

  private registerDiscoveredTools() {
    mcpRegistry.listTools().forEach((summary) => {
      const tool = mcpRegistry.getTool(summary.id);
      if (tool) toolRegistry.register(new MCPToolAdapter(tool));
    });
  }
}

export const mcpServer = new MCPServerFacade();
