import { z } from "zod";
import type { ApiRoute } from "../../types/api";
import { memoryService } from "../../memory/MemoryService";
import { json, parseJsonBody, validateParams } from "../../utils/http";
import {
  createMemoryRequestSchema,
  idParamSchema,
  memoriesResponseSchema,
  memoryResponseSchema,
  updateMemoryRequestSchema,
} from "../../validation/schemas";

const memoryDeleteResponseSchema = z.object({ deleted: z.boolean() });

export const memoryRoutes: ApiRoute[] = [
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
];
