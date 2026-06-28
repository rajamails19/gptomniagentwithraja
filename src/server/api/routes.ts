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
import { memoryService } from "../memory/MemoryService";
import { approvalService } from "../approvals/ApprovalService";
import { runEventService } from "../events/RunEventService";
import { json, parseJsonBody, validateParams } from "../utils/http";
import {
  approvalDecisionRequestSchema,
  approvalResponseSchema,
  approvalsResponseSchema,
  artifactResponseSchema,
  createRunRequestSchema,
  healthResponseSchema,
  idParamSchema,
  llmTestRequestSchema,
  llmTestResponseSchema,
  createMemoryRequestSchema,
  memoriesResponseSchema,
  memoryResponseSchema,
  runResponseSchema,
  runStatusResponseSchema,
  runsResponseSchema,
  scenarioResponseSchema,
  scenariosResponseSchema,
  traceResponseSchema,
  updateMemoryRequestSchema,
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

const eventsResponseSchema = z.object({
  events: z.array(z.unknown()),
  types: z.array(z.string()),
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

const memoryDeleteResponseSchema = z.object({ deleted: z.boolean() });

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
    path: "/api/v1/runs/:id/events",
    summary: "Stream real-time run events with Server-Sent Events.",
    handler: ({ params, request }) => {
      const { id } = validateParams(params, idParamSchema);
      runService.getRun(id);
      return runEventService.streamRunEvents(id, request);
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
    path: "/api/v1/runs/:id/memories",
    summary: "List memories written for one workflow run.",
    handler: ({ params, requestId }) => {
      const { id } = validateParams(params, idParamSchema);
      const data = memoriesResponseSchema.parse({ memories: memoryService.listForRun(id) });
      return json(data, requestId);
    },
  },
  {
    method: "GET",
    path: "/api/v1/runs/:id/approvals",
    summary: "List human approval requests for one workflow run.",
    handler: ({ params, requestId }) => {
      const { id } = validateParams(params, idParamSchema);
      const data = approvalsResponseSchema.parse({ approvals: approvalService.listForRun(id) });
      return json(data, requestId);
    },
  },
  {
    method: "GET",
    path: "/api/v1/scenarios/:id/memories",
    summary: "List reusable workflow memories for one scenario.",
    handler: ({ params, requestId }) => {
      const { id } = validateParams(params, idParamSchema);
      const data = memoriesResponseSchema.parse({ memories: memoryService.listForScenario(id) });
      return json(data, requestId);
    },
  },
  {
    method: "GET",
    path: "/api/v1/approvals",
    summary: "List human approval gates across workflow runs.",
    handler: ({ requestId }) => {
      const data = approvalsResponseSchema.parse({ approvals: approvalService.listApprovals() });
      return json(data, requestId);
    },
  },
  {
    method: "GET",
    path: "/api/v1/approvals/:id",
    summary: "Get one human approval request.",
    handler: ({ params, requestId }) => {
      const { id } = validateParams(params, idParamSchema);
      const data = approvalResponseSchema.parse({ approval: approvalService.getApproval(id) });
      return json(data, requestId);
    },
  },
  {
    method: "POST",
    path: "/api/v1/approvals/:id/approve",
    summary: "Approve a pending human approval request and resume the run.",
    handler: async ({ params, request, requestId }) => {
      const { id } = validateParams(params, idParamSchema);
      const payload = await parseJsonBody(request, approvalDecisionRequestSchema);
      const data = runStatusResponseSchema.parse(
        await workflowExecutionService.approveApproval(id, payload.reviewerNote),
      );
      return json(data, requestId);
    },
  },
  {
    method: "POST",
    path: "/api/v1/approvals/:id/reject",
    summary: "Reject a pending human approval request and stop the run before release.",
    handler: async ({ params, request, requestId }) => {
      const { id } = validateParams(params, idParamSchema);
      const payload = await parseJsonBody(request, approvalDecisionRequestSchema);
      const data = runStatusResponseSchema.parse(
        await workflowExecutionService.rejectApproval(id, payload.reviewerNote),
      );
      return json(data, requestId);
    },
  },
  {
    method: "GET",
    path: "/api/v1/memories",
    summary: "List run, workflow, and global demo memories.",
    handler: ({ requestId }) => {
      const data = memoriesResponseSchema.parse({ memories: memoryService.listMemories() });
      return json(data, requestId);
    },
  },
  {
    method: "GET",
    path: "/api/v1/memories/:id",
    summary: "Get one memory record by ID.",
    handler: ({ params, requestId }) => {
      const { id } = validateParams(params, idParamSchema);
      const data = memoryResponseSchema.parse({ memory: memoryService.getMemory(id) });
      return json(data, requestId);
    },
  },
  {
    method: "POST",
    path: "/api/v1/memories",
    summary: "Create a sanitized memory record.",
    handler: async ({ request, requestId }) => {
      const payload = await parseJsonBody(request, createMemoryRequestSchema);
      const data = memoryResponseSchema.parse({ memory: memoryService.createMemory(payload) });
      return json(data, requestId, 201);
    },
  },
  {
    method: "PATCH",
    path: "/api/v1/memories/:id",
    summary: "Update one sanitized memory record.",
    handler: async ({ params, request, requestId }) => {
      const { id } = validateParams(params, idParamSchema);
      const payload = await parseJsonBody(request, updateMemoryRequestSchema);
      const data = memoryResponseSchema.parse({ memory: memoryService.updateMemory(id, payload) });
      return json(data, requestId);
    },
  },
  {
    method: "DELETE",
    path: "/api/v1/memories/:id",
    summary: "Delete one memory record.",
    handler: ({ params, requestId }) => {
      const { id } = validateParams(params, idParamSchema);
      const data = memoryDeleteResponseSchema.parse(memoryService.deleteMemory(id));
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
  {
    method: "GET",
    path: "/api/v1/developer/events",
    summary: "List recent emitted SSE events and supported event types.",
    handler: ({ requestId }) => {
      const data = eventsResponseSchema.parse({
        events: runEventService.listRecent(),
        types: runEventService.listTypes(),
      });
      return json(data, requestId);
    },
  },
];

export function getRegisteredRoutes(): RegisteredRoute[] {
  return apiRoutes.map(({ method, path, summary }) => ({ method, path, summary }));
}
