import type {
  DemoEngineRuntime,
  DemoNodeId,
  DemoScenario,
  DemoStatus,
  DemoTimelineAction,
  ToolCall,
  TraceEvent,
  WorkflowStepRun,
  WorkflowStepStatus,
} from "./types";

const STEP_DELAY_MS = 1100;
const TRACE_OFFSET_MS = 220;
const RUN_COMPLETE_OFFSET_MS = 200;

export function createInitialEngineRuntime(scenario: DemoScenario): DemoEngineRuntime {
  return {
    currentIndex: -1,
    statuses: createStatuses(scenario, "idle"),
    stepRuns: createStepRuns(scenario),
    traceEvents: [],
    visibleToolCalls: [],
    runCost: 0,
    runTokens: 0,
  };
}

export function createQueuedEngineRuntime(scenario: DemoScenario): DemoEngineRuntime {
  return {
    ...createInitialEngineRuntime(scenario),
    statuses: createStatuses(scenario, "queued"),
    stepRuns: createStepRuns(scenario, "pending"),
  };
}

export function createScenarioTimeline(scenario: DemoScenario): DemoTimelineAction[] {
  const actions: DemoTimelineAction[] = [];

  scenario.steps.forEach((step, index) => {
    const stepStart = index * STEP_DELAY_MS;
    actions.push({ at: stepStart, type: "step:start", stepId: step.id });

    const messages = scenario.stepMessages[step.id];
    messages.forEach((message, messageIndex) => {
      actions.push({
        at: stepStart + messageIndex * TRACE_OFFSET_MS,
        type: "trace:add",
        stepId: step.id,
        traceEvent: {
          id: `${scenario.executionRecord.id}-${step.id}-${messageIndex + 1}`,
          runId: scenario.executionRecord.id,
          stepId: step.id,
          ts: "00:00:00",
          agent: step.agent,
          message: message.msg,
          tone: message.tone,
          type: message.type ?? "status",
          latencyMs: message.latencyMs,
          cost: message.cost,
          toolCallId: message.toolCallId,
        },
      });
    });

    actions.push({
      at: stepStart + Math.max(TRACE_OFFSET_MS, messages.length * TRACE_OFFSET_MS),
      type: "step:complete",
      stepId: step.id,
    });
  });

  actions.push({
    at: scenario.steps.length * STEP_DELAY_MS + RUN_COMPLETE_OFFSET_MS,
    type: "run:complete",
  });

  return actions.sort((a, b) => a.at - b.at);
}

export function applyTimelineAction(
  scenario: DemoScenario,
  runtime: DemoEngineRuntime,
  action: DemoTimelineAction,
  timestamp: string,
): DemoEngineRuntime {
  if (action.type === "step:start" && action.stepId) {
    const stepIndex = scenario.steps.findIndex((step) => step.id === action.stepId);
    return {
      ...runtime,
      currentIndex: stepIndex,
      statuses: {
        ...runtime.statuses,
        [action.stepId]: "running",
      },
      stepRuns: runtime.stepRuns.map((step) =>
        step.id === action.stepId ? { ...step, status: "running", startedAt: timestamp } : step,
      ),
    };
  }

  if (action.type === "trace:add" && action.traceEvent) {
    const traceEvent = { ...action.traceEvent, ts: timestamp };
    const toolCall = traceEvent.toolCallId
      ? getToolCall(scenario, traceEvent.toolCallId)
      : undefined;

    return {
      ...runtime,
      traceEvents: [...runtime.traceEvents, traceEvent],
      visibleToolCalls: addVisibleToolCall(runtime.visibleToolCalls, toolCall),
    };
  }

  if (action.type === "step:complete" && action.stepId) {
    const completedStatus = getCompletedStepStatus(scenario, action.stepId);
    return {
      ...runtime,
      statuses: {
        ...runtime.statuses,
        [action.stepId]: completedStatus === "failed" ? "error" : "success",
      },
      stepRuns: runtime.stepRuns.map((step) =>
        step.id === action.stepId
          ? {
              ...step,
              status: completedStatus,
              completedAt: timestamp,
            }
          : step,
      ),
      runCost: getCompletedCost(scenario, runtime, action.stepId),
      runTokens: getCompletedTokens(scenario, runtime, action.stepId),
    };
  }

  if (action.type === "run:complete") {
    return {
      ...runtime,
      statuses: {
        ...runtime.statuses,
        final: "success",
      },
      runCost: scenario.costSummary.totalCost,
      runTokens: scenario.costSummary.totalTokens,
    };
  }

  return runtime;
}

function createStatuses(
  scenario: DemoScenario,
  status: DemoStatus,
): Record<DemoNodeId, DemoStatus> {
  return Object.fromEntries(scenario.steps.map((step) => [step.id, status])) as Record<
    DemoNodeId,
    DemoStatus
  >;
}

function createStepRuns(
  scenario: DemoScenario,
  status: WorkflowStepStatus = "pending",
): WorkflowStepRun[] {
  return scenario.steps.map((step) => ({
    ...step,
    runId: scenario.executionRecord.id,
    status,
  }));
}

function getCompletedStepStatus(scenario: DemoScenario, stepId: DemoNodeId): WorkflowStepStatus {
  const hasRetry = scenario.stepMessages[stepId].some((message) => message.type === "retry");
  return hasRetry ? "retried" : "completed";
}

function getCompletedCost(
  scenario: DemoScenario,
  runtime: DemoEngineRuntime,
  stepId: DemoNodeId,
): number {
  const step = scenario.steps.find((item) => item.id === stepId);
  return +(runtime.runCost + (step?.cost ?? 0)).toFixed(2);
}

function getCompletedTokens(
  scenario: DemoScenario,
  runtime: DemoEngineRuntime,
  stepId: DemoNodeId,
): number {
  const step = scenario.steps.find((item) => item.id === stepId);
  return runtime.runTokens + (step?.tokens ?? 0);
}

function getToolCall(scenario: DemoScenario, toolCallId: string): ToolCall | undefined {
  return scenario.toolCalls.find((toolCall) => toolCall.id === toolCallId);
}

function addVisibleToolCall(toolCalls: ToolCall[], toolCall?: ToolCall): ToolCall[] {
  if (!toolCall || toolCalls.some((item) => item.id === toolCall.id)) return toolCalls;
  return [...toolCalls, toolCall];
}
