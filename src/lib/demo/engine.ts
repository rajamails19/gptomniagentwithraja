import { DEMO_RUN_ID, DEMO_SCENARIO } from "./seed-data";
import type {
  DemoEngineRuntime,
  DemoNodeId,
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

export function createInitialEngineRuntime(): DemoEngineRuntime {
  return {
    currentIndex: -1,
    statuses: createStatuses("idle"),
    stepRuns: createStepRuns(),
    traceEvents: [],
    visibleToolCalls: [],
    runCost: 0,
    runTokens: 0,
  };
}

export function createQueuedEngineRuntime(): DemoEngineRuntime {
  return {
    ...createInitialEngineRuntime(),
    statuses: createStatuses("queued"),
    stepRuns: createStepRuns("pending"),
  };
}

export function createScenarioTimeline(): DemoTimelineAction[] {
  const actions: DemoTimelineAction[] = [];

  DEMO_SCENARIO.steps.forEach((step, index) => {
    const stepStart = index * STEP_DELAY_MS;
    actions.push({ at: stepStart, type: "step:start", stepId: step.id });

    const messages = DEMO_SCENARIO.stepMessages[step.id];
    messages.forEach((message, messageIndex) => {
      actions.push({
        at: stepStart + messageIndex * TRACE_OFFSET_MS,
        type: "trace:add",
        stepId: step.id,
        traceEvent: {
          id: `${DEMO_RUN_ID}-${step.id}-${messageIndex + 1}`,
          runId: DEMO_RUN_ID,
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
    at: DEMO_SCENARIO.steps.length * STEP_DELAY_MS + RUN_COMPLETE_OFFSET_MS,
    type: "run:complete",
  });

  return actions.sort((a, b) => a.at - b.at);
}

export function applyTimelineAction(
  runtime: DemoEngineRuntime,
  action: DemoTimelineAction,
  timestamp: string,
): DemoEngineRuntime {
  if (action.type === "step:start" && action.stepId) {
    const stepIndex = DEMO_SCENARIO.steps.findIndex((step) => step.id === action.stepId);
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
    const toolCall = traceEvent.toolCallId ? getToolCall(traceEvent.toolCallId) : undefined;

    return {
      ...runtime,
      traceEvents: [...runtime.traceEvents, traceEvent],
      visibleToolCalls: addVisibleToolCall(runtime.visibleToolCalls, toolCall),
    };
  }

  if (action.type === "step:complete" && action.stepId) {
    const completedStatus = getCompletedStepStatus(action.stepId);
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
      runCost: getCompletedCost(runtime, action.stepId),
      runTokens: getCompletedTokens(runtime, action.stepId),
    };
  }

  if (action.type === "run:complete") {
    return {
      ...runtime,
      statuses: {
        ...runtime.statuses,
        final: "success",
      },
      runCost: DEMO_SCENARIO.costSummary.totalCost,
      runTokens: DEMO_SCENARIO.costSummary.totalTokens,
    };
  }

  return runtime;
}

function createStatuses(status: DemoStatus): Record<DemoNodeId, DemoStatus> {
  return Object.fromEntries(DEMO_SCENARIO.steps.map((step) => [step.id, status])) as Record<
    DemoNodeId,
    DemoStatus
  >;
}

function createStepRuns(status: WorkflowStepStatus = "pending"): WorkflowStepRun[] {
  return DEMO_SCENARIO.steps.map((step) => ({
    ...step,
    runId: DEMO_RUN_ID,
    status,
  }));
}

function getCompletedStepStatus(stepId: DemoNodeId): WorkflowStepStatus {
  return stepId === "docs" ? "retried" : "completed";
}

function getCompletedCost(runtime: DemoEngineRuntime, stepId: DemoNodeId): number {
  const step = DEMO_SCENARIO.steps.find((item) => item.id === stepId);
  return +(runtime.runCost + (step?.cost ?? 0)).toFixed(2);
}

function getCompletedTokens(runtime: DemoEngineRuntime, stepId: DemoNodeId): number {
  const step = DEMO_SCENARIO.steps.find((item) => item.id === stepId);
  return runtime.runTokens + (step?.tokens ?? 0);
}

function getToolCall(toolCallId: string): ToolCall | undefined {
  return DEMO_SCENARIO.toolCalls.find((toolCall) => toolCall.id === toolCallId);
}

function addVisibleToolCall(toolCalls: ToolCall[], toolCall?: ToolCall): ToolCall[] {
  if (!toolCall || toolCalls.some((item) => item.id === toolCall.id)) return toolCalls;
  return [...toolCalls, toolCall];
}
