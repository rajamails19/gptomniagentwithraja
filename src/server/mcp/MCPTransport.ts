import { z } from "zod";
import type { MCPExecuteResult, MCPServerConfig, MCPToolDefinition } from "./types";

export interface MCPTransport {
  connect(server: MCPServerConfig): Promise<void>;
  disconnect(server: MCPServerConfig): Promise<void>;
  discoverTools(server: MCPServerConfig): Promise<MCPToolDefinition[]>;
  executeTool(
    server: MCPServerConfig,
    tool: MCPToolDefinition,
    input: unknown,
  ): Promise<MCPExecuteResult>;
}

export class MockMCPTransport implements MCPTransport {
  async connect() {}

  async disconnect() {}

  async discoverTools(server: MCPServerConfig): Promise<MCPToolDefinition[]> {
    if (server.id === "local-mcp") {
      return [
        {
          id: "mcp.local.context-reader",
          name: "MCP Context Reader",
          description: "Reads scenario-scoped context from a local MCP provider.",
          serverId: server.id,
          inputSchema: z.object({ topic: z.string().min(1) }),
          outputSchema: z.object({
            topic: z.string(),
            notes: z.array(z.string()),
            source: z.string(),
          }),
        },
      ];
    }

    if (server.id === "filesystem-mcp") {
      return [
        {
          id: "mcp.filesystem.openapi-catalog",
          name: "Filesystem OpenAPI Catalog",
          description:
            "Returns an OpenAPI-like endpoint catalog exposed by a filesystem MCP server.",
          serverId: server.id,
          inputSchema: z.object({ service: z.string().min(1) }),
          outputSchema: z.object({
            service: z.string(),
            endpoints: z.array(
              z.object({ method: z.string(), path: z.string(), summary: z.string() }),
            ),
          }),
        },
      ];
    }

    return [];
  }

  async executeTool(
    server: MCPServerConfig,
    tool: MCPToolDefinition,
    input: unknown,
  ): Promise<MCPExecuteResult> {
    const started = performance.now();
    const parsed = tool.inputSchema.parse(input);

    if (tool.id === "mcp.filesystem.openapi-catalog") {
      const service = "service" in parsed ? String(parsed.service) : "payments";
      return {
        latencyMs: Math.max(1, Math.round(performance.now() - started)),
        output: tool.outputSchema.parse({
          service,
          endpoints: [
            { method: "POST", path: "/payments/intents", summary: "Create a PaymentIntent" },
            { method: "GET", path: "/payments/intents/:id", summary: "Retrieve a PaymentIntent" },
            { method: "POST", path: "/payments/refunds", summary: "Refund a captured charge" },
          ],
        }),
      };
    }

    return {
      latencyMs: Math.max(1, Math.round(performance.now() - started)),
      output: tool.outputSchema.parse({
        topic: "topic" in parsed ? String(parsed.topic) : "demo",
        notes: [
          "MCP server returned scoped context for the selected workflow.",
          "Tool discovery and execution are routed through the server-side registry.",
        ],
        source: server.name,
      }),
    };
  }
}

export function createTransport(kind: MCPServerConfig["transport"]): MCPTransport {
  if (kind === "mock") return new MockMCPTransport();
  return new MockMCPTransport();
}
