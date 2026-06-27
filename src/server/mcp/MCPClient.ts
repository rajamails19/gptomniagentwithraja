import { createTransport, type MCPTransport } from "./MCPTransport";
import type { MCPExecuteResult, MCPServerConfig, MCPToolDefinition } from "./types";

export class MCPClient {
  private transports = new Map<string, MCPTransport>();

  async connect(server: MCPServerConfig) {
    const transport = createTransport(server.transport);
    await transport.connect(server);
    this.transports.set(server.id, transport);
  }

  async disconnect(server: MCPServerConfig) {
    const transport = this.transports.get(server.id) ?? createTransport(server.transport);
    await transport.disconnect(server);
    this.transports.delete(server.id);
  }

  async discoverTools(server: MCPServerConfig): Promise<MCPToolDefinition[]> {
    const transport = this.transports.get(server.id) ?? createTransport(server.transport);
    return transport.discoverTools(server);
  }

  async executeTool(
    server: MCPServerConfig,
    tool: MCPToolDefinition,
    input: unknown,
  ): Promise<MCPExecuteResult> {
    const transport = this.transports.get(server.id) ?? createTransport(server.transport);
    return transport.executeTool(server, tool, input);
  }
}

export const mcpClient = new MCPClient();
