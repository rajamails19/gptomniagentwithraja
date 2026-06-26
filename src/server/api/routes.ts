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
import { json, parseJsonBody, validateParams } from "../utils/http";
import {
  artifactResponseSchema,
  createRunRequestSchema,
  healthResponseSchema,
  idParamSchema,
  runResponseSchema,
  runsResponseSchema,
  scenarioResponseSchema,
  scenariosResponseSchema,
  traceResponseSchema,
} from "../validation/schemas";

const agentsResponseSchema = z.object({
  agents: z.array(z.unknown()),
});

const toolsResponseSchema = z.object({
  tools: z.array(z.unknown()),
});

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

export const apiRoutes: ApiRoute[] = [
  {
    method: "GET",
    path: "/api/v1/health",
    summary: "API status, storage mode, scenario count, and run count.",
    handler: ({ requestId }) => {
      const data = healthResponseSchema.parse(healthService.getHealth());
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
    summary: "Create a new in-memory workflow run for a scenario.",
    handler: async ({ request, requestId }) => {
      const payload = await parseJsonBody(request, createRunRequestSchema);
      const data = runResponseSchema.parse({ run: runService.createRun(payload) });
      return json(data, requestId, 201);
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
    handler: ({ params, requestId }) => {
      const { id } = validateParams(params, idParamSchema);
      const data = traceResponseSchema.parse({ trace: traceService.getTraceForRun(id) });
      return json(data, requestId);
    },
  },
  {
    method: "GET",
    path: "/api/v1/runs/:id/artifact",
    summary: "Get final artifact for a workflow run.",
    handler: ({ params, requestId }) => {
      const { id } = validateParams(params, idParamSchema);
      const data = artifactResponseSchema.parse({
        artifact: artifactService.getArtifactForRun(id),
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
    summary: "List deterministic tools referenced by scenario runs.",
    handler: ({ requestId }) => {
      const data = toolsResponseSchema.parse({ tools: toolService.listTools() });
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
];

export function getRegisteredRoutes(): RegisteredRoute[] {
  return apiRoutes.map(({ method, path, summary }) => ({ method, path, summary }));
}
