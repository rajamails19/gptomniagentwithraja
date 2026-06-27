import { z } from "zod";
import type { ApiRoute, RegisteredRoute } from "../types/api";
import { agentService } from "../services/agent-service";
import { artifactService } from "../services/artifact-service";
import { developerService } from "../services/developer-service";
import { healthService } from "../services/health-service";
import { runService } from "../services/run-service";
import { scenarioService } from "../services/scenario-service";
import { settingsService } from "../services/settings-service";
import { toolService } from "../services/tool-service";
import { traceService } from "../services/trace-service";
import { workflowExecutionService } from "../services/workflow-execution-service";
import { llmService } from "../llm/LLMService";
import { mcpService } from "../services/mcp-service";
import { json, parseJsonBody, validateParams } from "../utils/http";
import {
  artifactResponseSchema,
  createRunRequestSchema,
  healthResponseSchema,
  idParamSchema,
  llmTestRequestSchema,
  llmTestResponseSchema,
  runResponseSchema,
  runStatusResponseSchema,
  runsResponseSchema,
  scenarioResponseSchema,
  scenariosResponseSchema,
  traceResponseSchema,
} from "../validation/schemas";
import { toolExecuteRequestSchema, toolExecutionResponseSchema } from "../tools/validation";

const agentsResponseSchema = z.object({
  agents: z.array(z.unknown()),
});

const toolsResponseSchema = z.object({
  tools: z.array(z.unknown()),
});

const toolResponseSchema = z.object({
  tool: z.unknown(),
});

const toolExecutionsResponseSchema = z.object({
  executions: z.array(z.unknown()),
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

const settingsResponseSchema = z.object({
  settings: z.unknown(),
});

const routesResponseSchema = z.object({
  routes: z.array(
    z.object({
      method: z.string(),
      path: z.string(),
      summary: z.string(),
    }),
  ),
});

const logsResponseSchema = z.object({
  logs: z.array(z.unknown()),
});

const executionLogsResponseSchema = z.object({
  logs: z.array(z.unknown()),
});

const runContextResponseSchema = z.object({
  context: z.unknown(),
});

const runAgentsResponseSchema = z.object({
  runId: z.string(),
  activeAgent: z.string().nullable(),
  agents: z.array(z.unknown()),
});

const runHandoffsResponseSchema = z.object({
  handoffs: z.array(z.unknown()),
});

export const apiRoutes: ApiRoute[] = [
  {
    method: "GET",
    path: "/api/v1/health",
    summary: "API status, storage mode, scenario count, and run count.",
    handler: async ({ requestId }) => {
      const data = healthResponseSchema.parse(await healthService.getHealth());
      return json(data, requestId);
    },
  },
  {
    method: "POST",
    path: "/api/v1/llm/test",
    summary: "Generate a provider-neutral test response through the active LLM provider.",
    handler: async ({ request, requestId }) => {
      const payload = await parseJsonBody(request, llmTestRequestSchema);
      const result = await llmService.generate({
        prompt: payload.prompt,
        model: payload.model,
        temperature: payload.temperature,
        executionId: "llm-test",
      });
      const data = llmTestResponseSchema.parse({
        response: result.text,
        latencyMs: result.latencyMs,
        usage: result.usage,
        provider: result.provider,
        model: result.model,
      });
      return json(data, requestId);
    },
  },
  {
    method: "GET",
    path: "/api/v1/scenarios",
    summary: "List deterministic enterprise demo scenarios.",
    handler: ({ requestId }) => {
      const data = scenariosResponseSchema.parse({
        scenarios: scenarioService.listScenarios(),
      });
      return json(data, requestId);
    },
  },
  {
    method: "GET",
    path: "/api/v1/scenarios/:id",
    summary: "Get one scenario by ID.",
    handler: ({ params, requestId }) => {
      const { id } = validateParams(params, idParamSchema);
      const data = scenarioResponseSchema.parse({
        scenario: scenarioService.getScenario(id),
      });
      return json(data, requestId);
    },
  },
  {
    method: "GET",
    path: "/api/v1/runs",
    summary: "List seeded and newly created workflow runs.",
    handler: ({ requestId }) => {
      const data = runsResponseSchema.parse({ runs: runService.listRuns() });
      return json(data, requestId);
    },
  },
  {
    method: "POST",
    path: "/api/v1/runs",
    summary: "Create a queued persisted workflow run for a scenario.",
    handler: async ({ request, requestId }) => {
      const payload = await parseJsonBody(request, createRunRequestSchema);
      const data = runResponseSchema.parse({ run: workflowExecutionService.createRun(payload) });
      return json(data, requestId, 201);
    },
  },
  {
    method: "POST",
    path: "/api/v1/runs/:id/start",
    summary: "Start deterministic backend execution for a queued run.",
    handler: async ({ params, requestId }) => {
      const { id } = validateParams(params, idParamSchema);
      const data = runStatusResponseSchema.parse(await workflowExecutionService.startRun(id));
      return json(data, requestId);
    },
  },
  {
    method: "POST",
    path: "/api/v1/runs/:id/cancel",
    summary: "Cancel a queued or running workflow run.",
    handler: async ({ params, requestId }) => {
      const { id } = validateParams(params, idParamSchema);
      const data = runStatusResponseSchema.parse(await workflowExecutionService.cancelRun(id));
      return json(data, requestId);
    },
  },
  {
    method: "POST",
    path: "/api/v1/runs/:id/replay",
    summary: "Create and start a new deterministic replay from an existing run.",
    handler: async ({ params, requestId }) => {
      const { id } = validateParams(params, idParamSchema);
      const data = runStatusResponseSchema.parse(await workflowExecutionService.replayRun(id));
      return json(data, requestId, 201);
    },
  },
  {
    method: "GET",
    path: "/api/v1/runs/:id/status",
    summary: "Poll persisted lifecycle, step, trace, and artifact readiness for a run.",
    handler: async ({ params, requestId }) => {
      const { id } = validateParams(params, idParamSchema);
      const data = runStatusResponseSchema.parse(await workflowExecutionService.getRunStatus(id));
      return json(data, requestId);
    },
  },
  {
    method: "GET",
    path: "/api/v1/runs/:id",
    summary: "Get one workflow run by ID.",
    handler: ({ params, requestId }) => {
      const { id } = validateParams(params, idParamSchema);
      const data = runResponseSchema.parse({ run: runService.getRun(id) });
      return json(data, requestId);
    },
  },
  {
    method: "GET",
    path: "/api/v1/runs/:id/trace",
    summary: "Get trace events for a workflow run.",
    handler: async ({ params, requestId }) => {
      const { id } = validateParams(params, idParamSchema);
      await workflowExecutionService.getRunStatus(id);
      const data = traceResponseSchema.parse({ trace: traceService.getTraceForRun(id) });
      return json(data, requestId);
    },
  },
  {
    method: "GET",
    path: "/api/v1/runs/:id/artifact",
    summary: "Get final artifact for a workflow run.",
    handler: async ({ params, requestId }) => {
      const { id } = validateParams(params, idParamSchema);
      await workflowExecutionService.getRunStatus(id);
      const data = artifactResponseSchema.parse({
        artifact: artifactService.getArtifactForRun(id),
      });
      return json(data, requestId);
    },
  },
  {
    method: "GET",
    path: "/api/v1/runs/:id/context",
    summary: "Get shared orchestration context for a workflow run.",
    handler: async ({ params, requestId }) => {
      const { id } = validateParams(params, idParamSchema);
      await workflowExecutionService.getRunStatus(id);
      const data = runContextResponseSchema.parse({
        context: workflowExecutionService.getRunContext(id),
      });
      return json(data, requestId);
    },
  },
  {
    method: "GET",
    path: "/api/v1/runs/:id/agents",
    summary: "Get orchestration agents and active agent for a workflow run.",
    handler: async ({ params, requestId }) => {
      const { id } = validateParams(params, idParamSchema);
      await workflowExecutionService.getRunStatus(id);
      const data = runAgentsResponseSchema.parse(workflowExecutionService.getRunAgents(id));
      return json(data, requestId);
    },
  },
  {
    method: "GET",
    path: "/api/v1/runs/:id/handoffs",
    summary: "Get agent handoffs for a workflow run.",
    handler: async ({ params, requestId }) => {
      const { id } = validateParams(params, idParamSchema);
      await workflowExecutionService.getRunStatus(id);
      const data = runHandoffsResponseSchema.parse({
        handoffs: workflowExecutionService.getRunHandoffs(id),
      });
      return json(data, requestId);
    },
  },
  {
    method: "GET",
    path: "/api/v1/agents",
    summary: "List demo agents available to scenarios.",
    handler: ({ requestId }) => {
      const data = agentsResponseSchema.parse({ agents: agentService.listAgents() });
      return json(data, requestId);
    },
  },
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
  {
    method: "GET",
    path: "/api/v1/developer/tool-executions",
    summary: "List recent server-side tool executions.",
    handler: ({ requestId }) => {
      const data = toolExecutionsResponseSchema.parse({
        executions: toolService.listRecentExecutions(),
      });
      return json(data, requestId);
    },
  },
  {
    method: "GET",
    path: "/api/v1/settings",
    summary: "Return current demo workspace API settings.",
    handler: ({ requestId }) => {
      const data = settingsResponseSchema.parse({ settings: settingsService.getSettings() });
      return json(data, requestId);
    },
  },
  {
    method: "GET",
    path: "/api/v1/developer/routes",
    summary: "List registered API routes for the hidden developer explorer.",
    handler: ({ requestId }) => {
      const data = routesResponseSchema.parse({
        routes: developerService.listRoutes(getRegisteredRoutes()),
      });
      return json(data, requestId);
    },
  },
  {
    method: "GET",
    path: "/api/v1/developer/logs",
    summary: "List recent in-memory API request logs.",
    handler: ({ requestId }) => {
      const data = logsResponseSchema.parse({ logs: developerService.listLogs() });
      return json(data, requestId);
    },
  },
  {
    method: "GET",
    path: "/api/v1/developer/execution-logs",
    summary: "List recent backend workflow execution lifecycle events.",
    handler: ({ requestId }) => {
      const data = executionLogsResponseSchema.parse({
        logs: developerService.listExecutionLogs(),
      });
      return json(data, requestId);
    },
  },
];

export function getRegisteredRoutes(): RegisteredRoute[] {
  return apiRoutes.map(({ method, path, summary }) => ({ method, path, summary }));
}
