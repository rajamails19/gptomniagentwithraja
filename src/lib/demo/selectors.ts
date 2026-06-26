import { DEMO_RUN_ID, DEMO_SCENARIO } from "./seed-data";
import type {
  CostSummary,
  DemoNodeId,
  DemoRun,
  DemoRuntimeSnapshot,
  DemoStatus,
  FinalArtifact,
  TraceEvent,
  WorkflowStep,
} from "./types";

export function getRunStatus(snapshot: DemoRuntimeSnapshot): ExecutionStatus {
  if (snapshot.isRunning) return "running";
  if (snapshot.isComplete) return "success";
  return "idle";
}

type ExecutionStatus = "idle" | "running" | "success" | "error";

export function getCurrentRun(snapshot: DemoRuntimeSnapshot): DemoRun {
  const status = getRunStatus(snapshot);
  const traceEvents = getTraceEventsForRun(snapshot, DEMO_RUN_ID);
  const costSummary = getCostSummaryForRun(snapshot, DEMO_RUN_ID);

  return {
    ...DEMO_SCENARIO.executionRecord,
    status: status === "idle" ? "running" : status,
    scenarioId: DEMO_SCENARIO.id,
    goal: DEMO_SCENARIO.goal,
    currentStepId: DEMO_SCENARIO.steps[snapshot.currentIndex]?.id ?? null,
    stepStatuses: snapshot.statuses,
    traceEvents,
    tokens: costSummary.totalTokens,
    cost: costSummary.totalCost,
    costSummary,
    finalArtifact: getFinalArtifactForRun(DEMO_RUN_ID),
  };
}

export function getActiveWorkflowStep(
  snapshot: DemoRuntimeSnapshot,
  stepId?: DemoNodeId,
): WorkflowStep {
  const activeId = stepId ?? DEMO_SCENARIO.steps[snapshot.currentIndex]?.id ?? "planner";
  return DEMO_SCENARIO.steps.find((step) => step.id === activeId) ?? DEMO_SCENARIO.steps[1];
}

export function getTraceEventsForRun(
  snapshot: DemoRuntimeSnapshot,
  runId = DEMO_RUN_ID,
): TraceEvent[] {
  return snapshot.logs.map((log, index) => {
    const stepId = getStepIdForAgent(log.agent);
    return {
      id: `${runId}-event-${index + 1}`,
      runId,
      stepId,
      ts: log.ts,
      agent: log.agent,
      message: log.message,
      tone: log.tone,
      type: getTraceType(log.message, stepId),
    };
  });
}

export function getCostSummaryForRun(
  snapshot: DemoRuntimeSnapshot,
  runId = DEMO_RUN_ID,
): CostSummary {
  if (!snapshot.isRunning && !snapshot.isComplete) return DEMO_SCENARIO.costSummary;

  return {
    ...DEMO_SCENARIO.costSummary,
    runId,
    totalCost: snapshot.isComplete ? DEMO_SCENARIO.costSummary.totalCost : 0.41,
    totalTokens: snapshot.isComplete
      ? DEMO_SCENARIO.costSummary.totalTokens
      : snapshot.metrics.tokens % 100000,
  };
}

export function getFinalArtifactForRun(runId = DEMO_RUN_ID): FinalArtifact {
  return { ...DEMO_SCENARIO.finalArtifact, runId };
}

export function getWorkflowStepStatus(
  snapshot: DemoRuntimeSnapshot,
  stepId: DemoNodeId,
): DemoStatus {
  return snapshot.statuses[stepId];
}

function getStepIdForAgent(agent: string): DemoNodeId {
  return DEMO_SCENARIO.steps.find((step) => step.agent === agent)?.id ?? "user";
}

function getTraceType(message: string, stepId: DemoNodeId): TraceEvent["type"] {
  if (message.includes("ToolTimeoutError")) return "retry";
  if (message.includes("Artifact published")) return "artifact";
  if (message.includes("QA passed") || message.includes("Approved")) return "review";
  if (message.includes("Retrieved") || message.includes("Found")) return "tool_result";
  if (stepId === "research" || stepId === "code" || stepId === "docs") return "tool_call";
  return "status";
}
