import { z } from "zod";
import type { ApiRoute } from "../../types/api";
import { toolService } from "../../services/tool-service";
import { mcpService } from "../../services/mcp-service";
import { json, parseJsonBody, validateParams } from "../../utils/http";
import { idParamSchema } from "../../validation/schemas";
import { toolExecuteRequestSchema, toolExecutionResponseSchema } from "../../tools/validation";

const toolsResponseSchema = z.object({
  tools: z.array(z.unknown()),
});

const toolResponseSchema = z.object({
  tool: z.unknown(),
});

const mcpOverviewResponseSchema = z.object({
  status: z.string(),
  configSource: z.enum(["env", "file", "fallback"]),
  validationStatus: z.enum(["valid", "invalid"]),
  configErrors: z.array(z.object({ serverId: z.string().optional(), message: z.string() })),
  connectedServers: z.number(),
  availableTools: z.number(),
  servers: z.array(z.unknown()),
  tools: z.array(z.unknown()),
  recentCalls: z.array(z.unknown()),
});

const mcpServersResponseSchema = z.object({ servers: z.array(z.unknown()) });
const mcpToolsResponseSchema = z.object({ tools: z.array(z.unknown()) });
const mcpServerActionSchema = z.object({ serverId: z.string().min(1) });
const mcpServerResponseSchema = z.object({ server: z.unknown() });

export const toolRoutes: ApiRoute[] = [
  {
    method: "GET",
    path: "/api/v1/tools",
    summary: "List registered server-side tools.",
    handler: async ({ requestId }) => {
      const data = toolsResponseSchema.parse({ tools: await toolService.listTools() });
      return json(data, requestId);
    },
  },
  {
    method: "GET",
    path: "/api/v1/tools/:id",
    summary: "Get one registered tool and its schema metadata.",
    handler: async ({ params, requestId }) => {
      const { id } = validateParams(params, idParamSchema);
      const data = toolResponseSchema.parse({ tool: await toolService.getTool(id) });
      return json(data, requestId);
    },
  },
  {
    method: "POST",
    path: "/api/v1/tools/:id/execute",
    summary: "Execute a safe server-side tool with validated input and output.",
    handler: async ({ params, request, requestId }) => {
      const { id } = validateParams(params, idParamSchema);
      const payload = await parseJsonBody(request, toolExecuteRequestSchema);
      const data = toolExecutionResponseSchema.parse(
        await toolService.executeTool(id, payload.input, {
          runId: payload.runId,
          traceEventId: payload.traceEventId,
        }),
      );
      return json(data, requestId);
    },
  },
  {
    method: "GET",
    path: "/api/v1/mcp",
    summary: "Get MCP status, connected servers, tools, and recent calls.",
    handler: async ({ requestId }) => {
      const data = mcpOverviewResponseSchema.parse(await mcpService.getOverview());
      return json(data, requestId);
    },
  },
  {
    method: "GET",
    path: "/api/v1/mcp/servers",
    summary: "List configured MCP servers and connection health.",
    handler: async ({ requestId }) => {
      const data = mcpServersResponseSchema.parse({ servers: await mcpService.listServers() });
      return json(data, requestId);
    },
  },
  {
    method: "GET",
    path: "/api/v1/mcp/tools",
    summary: "List discovered MCP tools.",
    handler: async ({ requestId }) => {
      const data = mcpToolsResponseSchema.parse({ tools: await mcpService.listTools() });
      return json(data, requestId);
    },
  },
  {
    method: "POST",
    path: "/api/v1/mcp/connect",
    summary: "Connect a configured MCP server and register discovered tools.",
    handler: async ({ request, requestId }) => {
      const payload = await parseJsonBody(request, mcpServerActionSchema);
      const data = mcpServerResponseSchema.parse({
        server: await mcpService.connect(payload.serverId),
      });
      return json(data, requestId);
    },
  },
  {
    method: "POST",
    path: "/api/v1/mcp/disconnect",
    summary: "Disconnect a configured MCP server and unregister its tools.",
    handler: async ({ request, requestId }) => {
      const payload = await parseJsonBody(request, mcpServerActionSchema);
      const data = mcpServerResponseSchema.parse({
        server: await mcpService.disconnect(payload.serverId),
      });
      return json(data, requestId);
    },
  },
];
