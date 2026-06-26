import { z } from "zod";

export const traceToneSchema = z.enum(["info", "success", "warn", "error"]);
export const demoNodeIdSchema = z.enum([
  "user",
  "planner",
  "research",
  "code",
  "docs",
  "qa",
  "reviewer",
  "final",
]);

export const costSummarySchema = z.object({
  runId: z.string(),
  totalCost: z.number(),
  totalTokens: z.number(),
  estimatedManualHours: z.string(),
  modelSavingsPercent: z.number(),
  latencyMs: z.number(),
});

export const finalArtifactSchema = z.object({
  runId: z.string(),
  title: z.string(),
  filename: z.string(),
  sizeLabel: z.string(),
  status: z.enum(["draft", "approved"]),
  approvedBy: z.string(),
  markdown: z.string(),
});

export const traceEventSchema = z.object({
  id: z.string(),
  runId: z.string(),
  stepId: demoNodeIdSchema,
  ts: z.string(),
  agent: z.string(),
  message: z.string(),
  tone: traceToneSchema,
  type: z.enum(["prompt", "tool_call", "tool_result", "retry", "review", "artifact", "status"]),
  latencyMs: z.number().optional(),
  cost: z.number().optional(),
  toolCallId: z.string().optional(),
});

export const scenarioSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  goal: z.string(),
  description: z.string(),
  businessObjective: z.string(),
  initialUserRequest: z.string(),
  plannerOutput: z.string(),
  presentationFocus: z.string(),
  successMetrics: z.array(z.object({ label: z.string(), value: z.string() })),
  costSummary: costSummarySchema,
  finalArtifact: finalArtifactSchema.omit({ markdown: true }),
});

export const runSchema = z.object({
  id: z.string(),
  scenarioId: z.string(),
  workflow: z.string(),
  status: z.enum(["success", "running", "error"]),
  duration: z.string(),
  tokens: z.number(),
  cost: z.number(),
  started: z.string(),
  currentStepId: demoNodeIdSchema.nullable(),
  costSummary: costSummarySchema,
  finalArtifact: finalArtifactSchema.omit({ markdown: true }),
});

export const createRunRequestSchema = z.object({
  scenarioId: z.string().optional(),
});

export type ApiCostSummary = z.infer<typeof costSummarySchema>;
export type ApiFinalArtifact = z.infer<typeof finalArtifactSchema>;
export type ApiTraceEvent = z.infer<typeof traceEventSchema>;
export type ApiScenario = z.infer<typeof scenarioSummarySchema>;
export type ApiRun = z.infer<typeof runSchema>;
export type CreateRunRequest = z.infer<typeof createRunRequestSchema>;
