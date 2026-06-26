export type DemoStatus = "idle" | "queued" | "running" | "success" | "error";
export type DemoNodeId =
  | "user"
  | "planner"
  | "research"
  | "code"
  | "docs"
  | "qa"
  | "reviewer"
  | "final";

export type TraceTone = "info" | "success" | "warn" | "error";

export interface Agent {
  id: string;
  name: string;
  role: string;
  model: string;
  tools: string[];
  skills: string[];
}

export interface WorkflowStep {
  id: DemoNodeId;
  label: string;
  agent: string;
  kind: "input" | "agent" | "output";
  order: number;
  description: string;
}

export interface TraceEvent {
  id: string;
  runId: string;
  stepId: DemoNodeId;
  ts: string;
  agent: string;
  message: string;
  tone: TraceTone;
  type: "prompt" | "tool_call" | "tool_result" | "retry" | "review" | "artifact" | "status";
}

export interface ToolCall {
  id: string;
  runId: string;
  stepId: DemoNodeId;
  tool: string;
  status: "success" | "retry" | "error";
  latencyMs: number;
  inputSummary: string;
  outputSummary: string;
}

export interface CostSummary {
  runId: string;
  totalCost: number;
  totalTokens: number;
  estimatedManualHours: string;
  modelSavingsPercent: number;
}

export interface FinalArtifact {
  runId: string;
  title: string;
  filename: string;
  sizeLabel: string;
  status: "draft" | "approved";
  approvedBy: string;
  markdown: string;
}

export interface ExecutionRecord {
  id: string;
  workflow: string;
  status: "success" | "running" | "error";
  duration: string;
  tokens: number;
  cost: number;
  started: string;
  isDemo?: boolean;
}

export interface DemoRun extends ExecutionRecord {
  scenarioId: string;
  goal: string;
  currentStepId: DemoNodeId | null;
  stepStatuses: Record<DemoNodeId, DemoStatus>;
  traceEvents: TraceEvent[];
  costSummary: CostSummary;
  finalArtifact: FinalArtifact;
}

export interface DemoScenario {
  id: string;
  name: string;
  goal: string;
  description: string;
  agents: Agent[];
  steps: WorkflowStep[];
  toolCalls: ToolCall[];
  costSummary: CostSummary;
  finalArtifact: FinalArtifact;
  executionRecord: ExecutionRecord;
  stepMessages: Record<DemoNodeId, Array<{ msg: string; tone: TraceTone }>>;
}

export interface DemoMetrics {
  executions: number;
  tokens: number;
  cost: number;
  successRate: number;
  latency: number;
}

export interface DemoRuntimeSnapshot {
  isRunning: boolean;
  isComplete: boolean;
  currentIndex: number;
  statuses: Record<DemoNodeId, DemoStatus>;
  logs: Array<{
    ts: string;
    agent: string;
    message: string;
    tone: TraceTone;
  }>;
  metrics: DemoMetrics;
  completedExecutions: ExecutionRecord[];
  lastCompletedId: string | null;
}
