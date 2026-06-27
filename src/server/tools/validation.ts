import { z } from "zod";

export const toolExecuteRequestSchema = z.object({
  input: z.unknown(),
  runId: z.string().optional(),
  traceEventId: z.string().optional(),
});

export const toolExecutionResponseSchema = z.object({
  toolExecutionId: z.string(),
  toolId: z.string(),
  output: z.unknown(),
  durationMs: z.number(),
  status: z.enum(["success", "error"]),
});
