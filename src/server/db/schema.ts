import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const scenariosTable = sqliteTable("scenarios", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  payloadJson: text("payload_json").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const runsTable = sqliteTable("runs", {
  id: text("id").primaryKey(),
  scenarioId: text("scenario_id").notNull(),
  workflow: text("workflow").notNull(),
  status: text("status", {
    enum: [
      "queued",
      "running",
      "waiting_for_approval",
      "completed",
      "failed",
      "cancelled",
      "rejected",
    ],
  }).notNull(),
  duration: text("duration").notNull(),
  tokens: integer("tokens").notNull(),
  cost: real("cost").notNull(),
  started: text("started").notNull(),
  currentStepId: text("current_step_id"),
  costSummaryJson: text("cost_summary_json").notNull(),
  finalArtifactJson: text("final_artifact_json").notNull(),
  startedAt: text("started_at"),
  completedAt: text("completed_at"),
  cancelledAt: text("cancelled_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const workflowStepsTable = sqliteTable("workflow_steps", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull(),
  stepId: text("step_id").notNull(),
  label: text("label").notNull(),
  agent: text("agent").notNull(),
  status: text("status", {
    enum: ["pending", "running", "completed", "failed", "retried", "skipped"],
  }).notNull(),
  sequence: integer("sequence").notNull(),
  startedAt: text("started_at"),
  completedAt: text("completed_at"),
  updatedAt: text("updated_at").notNull(),
});

export const traceEventsTable = sqliteTable("trace_events", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull(),
  stepId: text("step_id").notNull(),
  sequence: integer("sequence").notNull(),
  ts: text("ts").notNull(),
  agent: text("agent").notNull(),
  message: text("message").notNull(),
  tone: text("tone", { enum: ["info", "success", "warn", "error"] }).notNull(),
  type: text("type", {
    enum: ["prompt", "tool_call", "tool_result", "retry", "review", "artifact", "status"],
  }).notNull(),
  latencyMs: integer("latency_ms"),
  cost: real("cost"),
  toolCallId: text("tool_call_id"),
  memoryIdsJson: text("memory_ids_json"),
  createdAt: text("created_at").notNull(),
});

export const artifactsTable = sqliteTable("artifacts", {
  runId: text("run_id").primaryKey(),
  title: text("title").notNull(),
  filename: text("filename").notNull(),
  sizeLabel: text("size_label").notNull(),
  status: text("status", { enum: ["draft", "approved"] }).notNull(),
  approvedBy: text("approved_by").notNull(),
  markdown: text("markdown").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const agentsTable = sqliteTable("agents", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  model: text("model").notNull(),
  payloadJson: text("payload_json").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const toolsTable = sqliteTable("tools", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  payloadJson: text("payload_json").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const settingsTable = sqliteTable("settings", {
  key: text("key").primaryKey(),
  valueJson: text("value_json").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const llmLogsTable = sqliteTable("llm_logs", {
  id: text("id").primaryKey(),
  executionId: text("execution_id"),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  prompt: text("prompt").notNull(),
  response: text("response").notNull(),
  latencyMs: integer("latency_ms").notNull(),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  totalTokens: integer("total_tokens"),
  status: text("status", { enum: ["success", "error"] }).notNull(),
  errorMessage: text("error_message"),
  createdAt: text("created_at").notNull(),
});

export const toolExecutionsTable = sqliteTable("tool_executions", {
  id: text("id").primaryKey(),
  runId: text("run_id"),
  traceEventId: text("trace_event_id"),
  toolId: text("tool_id").notNull(),
  inputSummary: text("input_summary").notNull(),
  outputSummary: text("output_summary").notNull(),
  status: text("status", { enum: ["success", "error"] }).notNull(),
  durationMs: integer("duration_ms").notNull(),
  error: text("error"),
  createdAt: text("created_at").notNull(),
});

export const orchestrationContextsTable = sqliteTable("orchestration_contexts", {
  runId: text("run_id").primaryKey(),
  payloadJson: text("payload_json").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const agentHandoffsTable = sqliteTable("agent_handoffs", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull(),
  sequence: integer("sequence").notNull(),
  fromAgent: text("from_agent").notNull(),
  toAgent: text("to_agent").notNull(),
  stepId: text("step_id").notNull(),
  message: text("message").notNull(),
  confidence: real("confidence").notNull(),
  latencyMs: integer("latency_ms").notNull(),
  createdAt: text("created_at").notNull(),
});

export const memoriesTable = sqliteTable("memories", {
  id: text("id").primaryKey(),
  scope: text("scope", { enum: ["run", "workflow", "global"] }).notNull(),
  runId: text("run_id"),
  scenarioId: text("scenario_id"),
  agentId: text("agent_id"),
  content: text("content").notNull(),
  tagsJson: text("tags_json").notNull(),
  importance: integer("importance").notNull(),
  source: text("source").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const approvalRequestsTable = sqliteTable("approval_requests", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull(),
  scenarioId: text("scenario_id").notNull(),
  agentId: text("agent_id"),
  stepId: text("step_id").notNull(),
  status: text("status", {
    enum: ["pending", "approved", "rejected", "expired", "skipped"],
  }).notNull(),
  reason: text("reason").notNull(),
  riskLevel: text("risk_level", { enum: ["low", "medium", "high", "critical"] }).notNull(),
  requestedAction: text("requested_action").notNull(),
  artifactPreview: text("artifact_preview").notNull(),
  reviewerNote: text("reviewer_note"),
  createdAt: text("created_at").notNull(),
  decidedAt: text("decided_at"),
});

export const pageVisitsTable = sqliteTable("page_visits", {
  id: text("id").primaryKey(),
  path: text("path").notNull(),
  referrer: text("referrer"),
  userAgent: text("user_agent"),
  visitorHash: text("visitor_hash").notNull(),
  deviceType: text("device_type", { enum: ["desktop", "mobile", "tablet", "bot", "unknown"] })
    .notNull()
    .default("unknown"),
  country: text("country"),
  region: text("region"),
  city: text("city"),
  timezone: text("timezone"),
  isBot: integer("is_bot", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
});

export const evalReportsTable = sqliteTable("eval_reports", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull().unique(),
  scenarioId: text("scenario_id").notNull(),
  workflow: text("workflow").notNull(),
  status: text("status", { enum: ["passed", "review", "failed"] }).notNull(),
  releaseDecision: text("release_decision", {
    enum: ["approved", "needs_review", "blocked"],
  }).notNull(),
  overallScore: integer("overall_score").notNull(),
  qualityScore: integer("quality_score").notNull(),
  safetyScore: integer("safety_score").notNull(),
  costScore: integer("cost_score").notNull(),
  traceabilityScore: integer("traceability_score").notNull(),
  summary: text("summary").notNull(),
  generatedAt: text("generated_at").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const evalChecksTable = sqliteTable("eval_checks", {
  id: text("id").primaryKey(),
  reportId: text("report_id").notNull(),
  runId: text("run_id").notNull(),
  category: text("category", {
    enum: ["accuracy", "completeness", "safety", "tooling", "cost", "traceability", "approval"],
  }).notNull(),
  name: text("name").notNull(),
  status: text("status", { enum: ["passed", "warning", "failed"] }).notNull(),
  score: integer("score").notNull(),
  severity: text("severity", { enum: ["low", "medium", "high", "critical"] }).notNull(),
  evidence: text("evidence").notNull(),
  source: text("source").notNull(),
  createdAt: text("created_at").notNull(),
});

export type RunRow = typeof runsTable.$inferSelect;
export type WorkflowStepRow = typeof workflowStepsTable.$inferSelect;
export type TraceEventRow = typeof traceEventsTable.$inferSelect;
export type ArtifactRow = typeof artifactsTable.$inferSelect;
export type MemoryRow = typeof memoriesTable.$inferSelect;
export type ApprovalRequestRow = typeof approvalRequestsTable.$inferSelect;
export type PageVisitRow = typeof pageVisitsTable.$inferSelect;
export type EvalReportRow = typeof evalReportsTable.$inferSelect;
export type EvalCheckRow = typeof evalChecksTable.$inferSelect;
