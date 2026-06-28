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
  approvedBy: z.string().nullable(),
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
  memoryIds: z.array(z.string()).optional(),
});

export const memoryScopeSchema = z.enum(["run", "workflow", "global"]);

export const memorySchema = z.object({
  id: z.string(),
  scope: memoryScopeSchema,
  runId: z.string().nullable(),
  scenarioId: z.string().nullable(),
  agentId: z.string().nullable(),
  content: z.string(),
  tags: z.array(z.string()),
  importance: z.number(),
  source: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createMemoryRequestSchema = z.object({
  scope: memoryScopeSchema,
  runId: z.string().nullable().optional(),
  scenarioId: z.string().nullable().optional(),
  agentId: z.string().nullable().optional(),
  content: z.string().min(1).max(2_000),
  tags: z.array(z.string().min(1).max(40)).max(12).default([]),
  importance: z.number().min(1).max(100).default(50),
  source: z.string().min(1).max(120).default("manual"),
});

export const updateMemoryRequestSchema = createMemoryRequestSchema.partial();

export const approvalStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
  "expired",
  "skipped",
]);

export const approvalRiskLevelSchema = z.enum(["low", "medium", "high", "critical"]);

export const approvalRequestSchema = z.object({
  id: z.string(),
  runId: z.string(),
  scenarioId: z.string(),
  agentId: z.string().nullable(),
  stepId: demoNodeIdSchema,
  status: approvalStatusSchema,
  reason: z.string(),
  riskLevel: approvalRiskLevelSchema,
  requestedAction: z.string(),
  artifactPreview: z.string(),
  reviewerNote: z.string().nullable(),
  createdAt: z.string(),
  decidedAt: z.string().nullable(),
});

export const approvalDecisionRequestSchema = z.object({
  reviewerNote: z.string().max(1_000).optional(),
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
  status: z.enum([
    "queued",
    "running",
    "waiting_for_approval",
    "completed",
    "failed",
    "cancelled",
    "rejected",
    "success",
    "error",
  ]),
  duration: z.string(),
  tokens: z.number(),
  cost: z.number(),
  started: z.string(),
  currentStepId: demoNodeIdSchema.nullable(),
  costSummary: costSummarySchema,
  finalArtifact: finalArtifactSchema.omit({ markdown: true }),
});

export const workflowStepStatusSchema = z.enum([
  "pending",
  "running",
  "completed",
  "failed",
  "retried",
  "skipped",
]);

export const runStatusResponseSchema = z.object({
  run: runSchema,
  steps: z.array(
    z.object({
      id: demoNodeIdSchema,
      label: z.string(),
      agent: z.string(),
      status: workflowStepStatusSchema,
      order: z.number(),
      startedAt: z.string().nullable(),
      completedAt: z.string().nullable(),
    }),
  ),
  traceCount: z.number(),
  artifactReady: z.boolean(),
});

export const createRunRequestSchema = z.object({
  scenarioId: z.string().optional(),
});

export type ApiCostSummary = z.infer<typeof costSummarySchema>;
export type ApiFinalArtifact = z.infer<typeof finalArtifactSchema>;
export type ApiTraceEvent = z.infer<typeof traceEventSchema>;
export type ApiMemory = z.infer<typeof memorySchema>;
export type ApiMemoryScope = z.infer<typeof memoryScopeSchema>;
export type CreateMemoryRequest = z.infer<typeof createMemoryRequestSchema>;
export type UpdateMemoryRequest = z.infer<typeof updateMemoryRequestSchema>;
export type ApiApprovalRequest = z.infer<typeof approvalRequestSchema>;
export type ApiApprovalStatus = z.infer<typeof approvalStatusSchema>;
export type ApiApprovalRiskLevel = z.infer<typeof approvalRiskLevelSchema>;
export type ApprovalDecisionRequest = z.infer<typeof approvalDecisionRequestSchema>;
export type ApiScenario = z.infer<typeof scenarioSummarySchema>;
export type ApiRun = z.infer<typeof runSchema>;
export type ApiRunStatus = z.infer<typeof runStatusResponseSchema>;
export type CreateRunRequest = z.infer<typeof createRunRequestSchema>;
