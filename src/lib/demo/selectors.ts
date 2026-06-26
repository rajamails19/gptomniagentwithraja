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
    stepRuns: snapshot.engineRuntime.stepRuns,
    traceEvents,
    toolCalls: snapshot.engineRuntime.visibleToolCalls,
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
  if (runId === DEMO_RUN_ID) return snapshot.engineRuntime.traceEvents;

  return [];
}

export function getCostSummaryForRun(
  snapshot: DemoRuntimeSnapshot,
  runId = DEMO_RUN_ID,
): CostSummary {
  if (!snapshot.isRunning && !snapshot.isComplete) return DEMO_SCENARIO.costSummary;

  return {
    ...DEMO_SCENARIO.costSummary,
    runId,
    totalCost: snapshot.isComplete
      ? DEMO_SCENARIO.costSummary.totalCost
      : snapshot.engineRuntime.runCost,
    totalTokens: snapshot.isComplete
      ? DEMO_SCENARIO.costSummary.totalTokens
      : snapshot.engineRuntime.runTokens,
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
