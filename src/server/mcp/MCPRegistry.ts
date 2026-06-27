import { loadMcpConfig } from "./MCPConfig";
import { mcpClient } from "./MCPClient";
import type { MCPCallLog, MCPServerConfig, MCPServerConnection, MCPToolDefinition } from "./types";

export class MCPRegistry {
  private readonly config = loadMcpConfig();
  private servers = new Map<string, MCPServerConfig>(
    this.config.servers.map((server) => [server.id, server]),
  );
  private connections = new Map<string, MCPServerConnection>();
  private tools = new Map<string, MCPToolDefinition>();
  private calls: MCPCallLog[] = [];

  async initialize() {
    this.config.errors.forEach((error) => {
      this.logCall({
        serverId: error.serverId ?? "mcp-config",
        toolId: "configuration",
        requestSummary: this.config.source,
        responseSummary: "",
        status: "error",
        latencyMs: 0,
        error: error.message,
      });
    });

    for (const server of this.servers.values()) {
      if (server.enabled) await this.connect(server.id);
      else this.setDisconnected(server);
    }
  }

  getConfigStatus() {
    return {
      configSource: this.config.source,
      validationStatus: this.config.validationStatus,
      configErrors: this.config.errors,
    };
  }

  listServers() {
    return Array.from(this.connections.values());
  }

  listTools() {
    return Array.from(this.tools.values()).map((tool) => ({
      id: tool.id,
      name: tool.name,
      description: tool.description,
      originServer: tool.serverId,
      inputSchema: tool.inputSchema.description ?? tool.inputSchema._def.typeName,
      outputSchema: tool.outputSchema.description ?? tool.outputSchema._def.typeName,
    }));
  }

  getTool(id: string) {
    return this.tools.get(id);
  }

  getServer(id: string) {
    return this.servers.get(id);
  }

  async connect(id: string) {
    const server = this.servers.get(id);
    if (!server) throw new Error(`MCP server not found: ${id}`);
    try {
      await mcpClient.connect(server);
      const tools = await mcpClient.discoverTools(server);
      tools.forEach((tool) => this.tools.set(tool.id, tool));
      this.connections.set(
        id,
        this.toConnection(server, {
          status: "connected",
          health: "healthy",
          toolCount: tools.length,
          lastConnectedAt: new Date().toISOString(),
        }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "MCP connection failed";
      this.setError(server, message);
      this.logCall({
        serverId: server.id,
        toolId: "connection",
        requestSummary: server.transport,
        responseSummary: "",
        status: "error",
        latencyMs: 0,
        error: message,
      });
    }
    return this.connections.get(id)!;
  }

  async disconnect(id: string) {
    const server = this.servers.get(id);
    if (!server) throw new Error(`MCP server not found: ${id}`);
    await mcpClient.disconnect(server);
    Array.from(this.tools.values())
      .filter((tool) => tool.serverId === id)
      .forEach((tool) => this.tools.delete(tool.id));
    this.setDisconnected(server);
    return this.connections.get(id)!;
  }

  async execute(toolId: string, input: unknown) {
    const tool = this.tools.get(toolId);
    if (!tool) throw new Error(`MCP tool not found: ${toolId}`);
    const server = this.servers.get(tool.serverId);
    if (!server) throw new Error(`MCP server not found: ${tool.serverId}`);
    const started = performance.now();
    try {
      const result = await mcpClient.executeTool(server, tool, input);
      this.logCall({
        serverId: server.id,
        toolId,
        requestSummary: summarize(input),
        responseSummary: summarize(result.output),
        status: "success",
        latencyMs: result.latencyMs || Math.round(performance.now() - started),
        error: null,
      });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "MCP execution failed";
      this.logCall({
        serverId: server.id,
        toolId,
        requestSummary: summarize(input),
        responseSummary: "",
        status: "error",
        latencyMs: Math.round(performance.now() - started),
        error: message,
      });
      throw error;
    }
  }

  listCalls() {
    return this.calls.slice(0, 20);
  }

  private setDisconnected(server: MCPServerConfig) {
    this.connections.set(
      server.id,
      this.toConnection(server, {
        status: "disconnected",
        health: "offline",
        toolCount: 0,
        lastConnectedAt: null,
      }),
    );
  }

  private setError(server: MCPServerConfig, error: string) {
    Array.from(this.tools.values())
      .filter((tool) => tool.serverId === server.id)
      .forEach((tool) => this.tools.delete(tool.id));

    this.connections.set(
      server.id,
      this.toConnection(server, {
        status: "error",
        health: "degraded",
        toolCount: 0,
        lastConnectedAt: null,
        error,
      }),
    );
  }

  private toConnection(
    server: MCPServerConfig,
    state: Pick<MCPServerConnection, "status" | "health" | "toolCount" | "lastConnectedAt"> &
      Partial<Pick<MCPServerConnection, "error">>,
  ): MCPServerConnection {
    return {
      id: server.id,
      name: server.name,
      description: server.description,
      transport: server.transport,
      timeoutMs: server.timeoutMs,
      configSource: this.config.source,
      validationStatus: this.config.validationStatus,
      ...state,
    };
  }

  private logCall(call: Omit<MCPCallLog, "id" | "createdAt">) {
    this.calls.unshift({
      id: `mcp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      ...call,
    });
    this.calls = this.calls.slice(0, 50);
  }
}

export const mcpRegistry = new MCPRegistry();

function summarize(value: unknown) {
  const serialized = typeof value === "string" ? value : JSON.stringify(value);
  if (!serialized) return "";
  return serialized.length > 420 ? `${serialized.slice(0, 417)}...` : serialized;
}
