import type { DemoNodeId, DemoScenario, TraceEvent } from "@/lib/demo/types";
import type { ApiRun } from "@/lib/api/schemas";

export type AgentExecutionStatus = "queued" | "running" | "completed" | "failed" | "retried";

export interface AgentDefinition {
  id: string;
  name: string;
  role: string;
  systemPrompt: string;
  allowedTools: string[];
  allowedModels: string[];
  execute(context: AgentExecutionContext): Promise<AgentExecutionResult>;
  confidence(context: ExecutionContextState): number;
  health(): AgentHealth;
}

export interface AgentHealth {
  status: "healthy" | "degraded";
  averageLatencyMs: number;
  successRate: number;
  retryCount: number;
}

export interface AgentExecutionContext extends ExecutionContextState {
  runTool: (toolId: string, input: unknown, traceEventId: string) => Promise<AgentToolResult>;
  generateText: (prompt: string, system?: string, model?: string) => Promise<string>;
}

export interface AgentToolResult {
  toolId: string;
  output: unknown;
  durationMs: number;
  status: "success" | "error";
}

export interface AgentExecutionResult {
  agentId: string;
  stepId: DemoNodeId;
  status: AgentExecutionStatus;
  summary: string;
  output?: string;
  artifacts?: Record<string, string>;
  toolOutputs?: Record<string, unknown>;
  traceEvents: TraceEvent[];
  confidence: number;
  latencyMs: number;
  cost: number;
  retryable?: boolean;
}

export interface HandoffRecord {
  id: string;
  runId: string;
  sequence: number;
  fromAgent: string;
  toAgent: string;
  stepId: DemoNodeId;
  message: string;
  confidence: number;
  latencyMs: number;
  createdAt: string;
}

export interface ExecutionContextState {
  runId: string;
  scenarioId: string;
  goal: string;
  userRequest: string;
  currentStep: DemoNodeId;
  currentAgent: string;
  metadata: {
    workflow: string;
    startedAt: string;
    updatedAt: string;
    status: ApiRun["status"];
    retryCount: number;
    averageConfidence: number;
    activeAgent: string;
    stage: string;
  };
  artifacts: Record<string, string>;
  toolOutputs: Record<string, unknown>;
  trace: TraceEvent[];
  memoryReferences: string[];
  handoffs: HandoffRecord[];
}

export interface OrchestrationSnapshot {
  context: ExecutionContextState;
  traces: TraceEvent[];
  handoffs: HandoffRecord[];
  activeStepId: DemoNodeId;
  averageConfidence: number;
  activeAgent: string;
  stage: string;
}

export const STEP_AGENT_SEQUENCE: Array<{ stepId: DemoNodeId; agentId: string }> = [
  { stepId: "user", agentId: "user" },
  { stepId: "planner", agentId: "planner" },
  { stepId: "research", agentId: "research" },
  { stepId: "code", agentId: "developer" },
  { stepId: "docs", agentId: "documentation" },
  { stepId: "qa", agentId: "qa" },
  { stepId: "reviewer", agentId: "reviewer" },
  { stepId: "final", agentId: "reviewer" },
];

export function createInitialExecutionContext(
  run: ApiRun,
  scenario: DemoScenario,
): ExecutionContextState {
  const now = new Date().toISOString();
  return {
    runId: run.id,
    scenarioId: scenario.id,
    goal: scenario.goal,
    userRequest: scenario.initialUserRequest,
    currentStep: "user",
    currentAgent: "User",
    metadata: {
      workflow: scenario.title,
      startedAt: now,
      updatedAt: now,
      status: run.status,
      retryCount: 0,
      averageConfidence: 0,
      activeAgent: "User",
      stage: "Request received",
    },
    artifacts: {},
    toolOutputs: {},
    trace: [],
    memoryReferences: scenario.steps.flatMap((step) => step.memoryContext).filter(Boolean),
    handoffs: [],
  };
}
