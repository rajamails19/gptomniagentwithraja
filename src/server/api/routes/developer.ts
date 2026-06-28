import { z } from "zod";
import type { ApiRoute, RegisteredRoute } from "../../types/api";
import { developerService } from "../../services/developer-service";
import { toolService } from "../../services/tool-service";
import { runEventService } from "../../events/RunEventService";
import { json } from "../../utils/http";

const toolExecutionsResponseSchema = z.object({
  executions: z.array(z.unknown()),
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

export function createDeveloperRoutes(getRegisteredRoutes: () => RegisteredRoute[]): ApiRoute[] {
  return [
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
}
