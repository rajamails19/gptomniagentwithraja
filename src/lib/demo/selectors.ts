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
  const runId = snapshot.scenario.executionRecord.id;
  const traceEvents = getTraceEventsForRun(snapshot, runId);
  const costSummary = getCostSummaryForRun(snapshot, runId);

  return {
    ...snapshot.scenario.executionRecord,
    status: status === "idle" ? "running" : status,
    scenarioId: snapshot.scenario.id,
    goal: snapshot.scenario.goal,
    currentStepId: snapshot.scenario.steps[snapshot.currentIndex]?.id ?? null,
    stepStatuses: snapshot.statuses,
    stepRuns: snapshot.engineRuntime.stepRuns,
    traceEvents,
    toolCalls: snapshot.engineRuntime.visibleToolCalls,
    tokens: costSummary.totalTokens,
    cost: costSummary.totalCost,
    costSummary,
    finalArtifact: getFinalArtifactForRun(snapshot, runId),
  };
}

export function getActiveWorkflowStep(
  snapshot: DemoRuntimeSnapshot,
  stepId?: DemoNodeId,
): WorkflowStep {
  const activeId = stepId ?? snapshot.scenario.steps[snapshot.currentIndex]?.id ?? "planner";
  return snapshot.scenario.steps.find((step) => step.id === activeId) ?? snapshot.scenario.steps[1];
}

export function getTraceEventsForRun(
  snapshot: DemoRuntimeSnapshot,
  runId = snapshot.scenario.executionRecord.id,
): TraceEvent[] {
  if (runId === snapshot.scenario.executionRecord.id) return snapshot.engineRuntime.traceEvents;

  return [];
}

export function getCostSummaryForRun(
  snapshot: DemoRuntimeSnapshot,
  runId = snapshot.scenario.executionRecord.id,
): CostSummary {
  if (!snapshot.isRunning && !snapshot.isComplete) return snapshot.scenario.costSummary;

  return {
    ...snapshot.scenario.costSummary,
    runId,
    totalCost: snapshot.isComplete
      ? snapshot.scenario.costSummary.totalCost
      : snapshot.engineRuntime.runCost,
    totalTokens: snapshot.isComplete
      ? snapshot.scenario.costSummary.totalTokens
      : snapshot.engineRuntime.runTokens,
  };
}

export function getFinalArtifactForRun(
  snapshot: DemoRuntimeSnapshot,
  runId = snapshot.scenario.executionRecord.id,
): FinalArtifact {
  return { ...snapshot.scenario.finalArtifact, runId };
}

export function getWorkflowStepStatus(
  snapshot: DemoRuntimeSnapshot,
  stepId: DemoNodeId,
): DemoStatus {
  return snapshot.statuses[stepId];
}
