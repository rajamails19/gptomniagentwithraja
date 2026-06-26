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
    enum: ["queued", "running", "completed", "failed", "cancelled"],
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

export type RunRow = typeof runsTable.$inferSelect;
export type WorkflowStepRow = typeof workflowStepsTable.$inferSelect;
export type TraceEventRow = typeof traceEventsTable.$inferSelect;
export type ArtifactRow = typeof artifactsTable.$inferSelect;
