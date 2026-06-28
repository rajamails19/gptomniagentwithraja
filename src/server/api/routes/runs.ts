import { z } from "zod";
import type { ApiRoute } from "../../types/api";
import { artifactService } from "../../services/artifact-service";
import { runService } from "../../services/run-service";
import { traceService } from "../../services/trace-service";
import { workflowExecutionService } from "../../services/workflow-execution-service";
import { runEventService } from "../../events/RunEventService";
import { json, parseJsonBody, validateParams } from "../../utils/http";
import {
  artifactResponseSchema,
  createRunRequestSchema,
  idParamSchema,
  runResponseSchema,
  runStatusResponseSchema,
  runsResponseSchema,
  traceResponseSchema,
} from "../../validation/schemas";

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

export const runRoutes: ApiRoute[] = [
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
];
