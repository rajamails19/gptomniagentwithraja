import { z } from "zod";
import type { ApiRoute, RegisteredRoute } from "../types/api";
import { agentService } from "../services/agent-service";
import { healthService } from "../services/health-service";
import { scenarioService } from "../services/scenario-service";
import { settingsService } from "../services/settings-service";
import { llmService } from "../llm/LLMService";
import { json, parseJsonBody, validateParams } from "../utils/http";
import {
  healthResponseSchema,
  idParamSchema,
  llmTestRequestSchema,
  llmTestResponseSchema,
  scenarioResponseSchema,
  scenariosResponseSchema,
} from "../validation/schemas";
import { adminRoutes } from "./routes/admin";
import { approvalRoutes } from "./routes/approvals";
import { createDeveloperRoutes } from "./routes/developer";
import { evalRoutes } from "./routes/evals";
import { memoryRoutes } from "./routes/memory";
import { runRoutes } from "./routes/runs";
import { toolRoutes } from "./routes/tools";

const agentsResponseSchema = z.object({
  agents: z.array(z.unknown()),
});

const settingsResponseSchema = z.object({
  settings: z.unknown(),
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
  ...runRoutes,
  ...evalRoutes,
  ...memoryRoutes,
  ...approvalRoutes,
  {
    method: "GET",
    path: "/api/v1/agents",
    summary: "List demo agents available to scenarios.",
    handler: ({ requestId }) => {
      const data = agentsResponseSchema.parse({ agents: agentService.listAgents() });
      return json(data, requestId);
    },
  },
  ...toolRoutes,
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
    method: "PATCH",
    path: "/api/v1/settings",
    summary: "Persist workspace settings changes to SQLite.",
    handler: async ({ request, requestId }) => {
      const body = await request.json().catch(() => ({}));
      const updated = settingsService.updateSettings(
        body as Parameters<typeof settingsService.updateSettings>[0],
      );
      const data = settingsResponseSchema.parse({ settings: updated });
      return json(data, requestId);
    },
  },
  ...createDeveloperRoutes(getRegisteredRoutes),
  ...adminRoutes,
];

export function getRegisteredRoutes(): RegisteredRoute[] {
  return apiRoutes.map(({ method, path, summary }) => ({ method, path, summary }));
}
