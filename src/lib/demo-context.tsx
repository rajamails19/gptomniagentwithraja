import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_SCENARIO_ID, DEMO_SCENARIOS, getDemoScenario } from "@/lib/demo/seed-data";
import { getCurrentRun } from "@/lib/demo/selectors";
import { cancelRun, createRun, getRunStatus, getRunTrace, startRun } from "@/lib/api/client";
import type { ApiRunStatus, ApiTraceEvent } from "@/lib/api/schemas";
import {
  applyTimelineAction,
  createInitialEngineRuntime,
  createQueuedEngineRuntime,
  createScenarioTimeline,
} from "@/lib/demo/engine";
import type {
  DemoEngineRuntime,
  DemoMetrics,
  DemoNodeId,
  DemoRun,
  DemoScenario,
  DemoStatus,
  ExecutionRecord,
  TraceTone,
} from "@/lib/demo/types";

export const DEMO_EXECUTION = getDemoScenario(DEFAULT_SCENARIO_ID).executionRecord;
export const DEMO_NODES = getDemoScenario(DEFAULT_SCENARIO_ID).steps.map(
  ({ id, label, agent }) => ({
    id,
    label,
    agent,
  }),
);
export { DEMO_SCENARIOS };
export type { DemoNodeId, DemoRun, DemoScenario, DemoStatus, ExecutionRecord };

export interface DemoLog {
  ts: string;
  agent: string;
  message: string;
  tone: TraceTone;
}

interface DemoState {
  isRunning: boolean;
  isComplete: boolean;
  currentIndex: number;
  statuses: Record<DemoNodeId, DemoStatus>;
  logs: DemoLog[];
  metrics: DemoMetrics;
  completedExecutions: ExecutionRecord[];
  currentRun: DemoRun;
  lastCompletedId: string | null;
  scenarios: DemoScenario[];
  selectedScenarioId: string;
  selectedScenario: DemoScenario;
  selectScenario: (scenarioId: string) => void;
  start: () => void;
  reset: () => void;
}

const DemoCtx = createContext<DemoState | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [selectedScenarioId, setSelectedScenarioId] = useState(DEFAULT_SCENARIO_ID);
  const selectedScenario = useMemo(() => getDemoScenario(selectedScenarioId), [selectedScenarioId]);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [engineRuntime, setEngineRuntime] = useState<DemoEngineRuntime>(() =>
    createInitialEngineRuntime(getDemoScenario(DEFAULT_SCENARIO_ID)),
  );
  const [metrics, setMetrics] = useState({
    executions: 12847,
    tokens: 8_420_000,
    cost: 1284,
    successRate: 98.6,
    latency: 842,
  });
  const [completedExecutions, setCompletedExecutions] = useState<ExecutionRecord[]>([]);
  const [lastCompletedId, setLastCompletedId] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const activeBackendRunId = useRef<string | null>(null);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const reset = useCallback(() => {
    const runId = activeBackendRunId.current;
    if (runId) void cancelRun(runId).catch(() => undefined);
    clearTimers();
    activeBackendRunId.current = null;
    setIsRunning(false);
    setIsComplete(false);
    setEngineRuntime(createInitialEngineRuntime(selectedScenario));
  }, [selectedScenario]);

  const selectScenario = useCallback((scenarioId: string) => {
    const scenario = getDemoScenario(scenarioId);
    clearTimers();
    setSelectedScenarioId(scenario.id);
    setIsRunning(false);
    setIsComplete(false);
    setLastCompletedId(null);
    setEngineRuntime(createInitialEngineRuntime(scenario));
  }, []);

  const startLocalDemo = useCallback(() => {
    clearTimers();
    setIsRunning(true);
    setIsComplete(false);
    setLastCompletedId(null);
    setEngineRuntime(createQueuedEngineRuntime(selectedScenario));

    createScenarioTimeline(selectedScenario).forEach((action) => {
      timers.current.push(
        setTimeout(() => {
          const ts = new Date().toLocaleTimeString([], { hour12: false });

          setEngineRuntime((runtime) => applyTimelineAction(selectedScenario, runtime, action, ts));

          if (action.type === "step:complete") {
            setMetrics((m) => ({
              executions: m.executions + 1,
              tokens: m.tokens + 12_400,
              cost: +(m.cost + 0.18).toFixed(2),
              successRate: Math.min(99.4, +(m.successRate + 0.02).toFixed(2)),
              latency: Math.max(720, m.latency - 4),
            }));
          }

          if (action.type === "run:complete") {
            setIsRunning(false);
            setIsComplete(true);
            setCompletedExecutions((prev) =>
              prev.some((e) => e.id === selectedScenario.executionRecord.id)
                ? prev
                : [{ ...selectedScenario.executionRecord }, ...prev],
            );
            setLastCompletedId(selectedScenario.executionRecord.id);
          }
        }, action.at),
      );
    });
  }, [selectedScenario]);

  const applyBackendStatus = useCallback(
    (status: ApiRunStatus, trace: ApiTraceEvent[]) => {
      const stepStatuses = { ...createInitialEngineRuntime(selectedScenario).statuses };
      status.steps.forEach((step) => {
        if (!step.id) return;
        stepStatuses[step.id] =
          step.status === "completed"
            ? "success"
            : step.status === "running"
              ? "running"
              : step.status === "failed"
                ? "error"
                : step.status === "retried"
                  ? "queued"
                  : "idle";
      });

      const currentIndex = Math.max(
        0,
        selectedScenario.steps.findIndex((step) => step.id === status.run.currentStepId),
      );

      setEngineRuntime({
        currentIndex,
        statuses: stepStatuses,
        stepRuns: selectedScenario.steps.map((step) => {
          const backendStep = status.steps.find((item) => item.id === step.id);
          return {
            ...step,
            runId: status.run.id,
            status:
              backendStep?.status === "completed"
                ? "completed"
                : backendStep?.status === "running"
                  ? "running"
                  : backendStep?.status === "failed"
                    ? "failed"
                    : backendStep?.status === "retried"
                      ? "retried"
                      : "pending",
            startedAt: backendStep?.startedAt ?? undefined,
            completedAt: backendStep?.completedAt ?? undefined,
          };
        }),
        traceEvents: trace,
        visibleToolCalls: selectedScenario.toolCalls.filter((toolCall) =>
          trace.some((event) => event.toolCallId === toolCall.id),
        ),
        runCost: status.run.cost,
        runTokens: status.run.tokens,
      });

      if (status.run.status === "completed") {
        setIsRunning(false);
        setIsComplete(true);
        setCompletedExecutions((prev) =>
          prev.some((execution) => execution.id === status.run.id)
            ? prev
            : [
                {
                  id: status.run.id,
                  workflow: status.run.workflow,
                  status: "success",
                  duration: status.run.duration,
                  tokens: status.run.tokens,
                  cost: status.run.cost,
                  started: status.run.started,
                  isDemo: true,
                },
                ...prev,
              ],
        );
        setLastCompletedId(status.run.id);
      }
    },
    [selectedScenario],
  );

  const pollBackendRun = useCallback(
    (runId: string) => {
      timers.current.push(
        setTimeout(async () => {
          if (activeBackendRunId.current !== runId) return;
          try {
            const [status, trace] = await Promise.all([
              getRunStatus(runId),
              getRunTrace(runId).catch(() => []),
            ]);
            applyBackendStatus(status, trace);
            if (status.run.status === "running" || status.run.status === "queued") {
              pollBackendRun(runId);
            }
          } catch {
            activeBackendRunId.current = null;
            startLocalDemo();
          }
        }, 500),
      );
    },
    [applyBackendStatus, startLocalDemo],
  );

  const start = useCallback(() => {
    clearTimers();
    activeBackendRunId.current = null;
    setIsRunning(true);
    setIsComplete(false);
    setLastCompletedId(null);
    setEngineRuntime(createQueuedEngineRuntime(selectedScenario));

    void (async () => {
      try {
        const queuedRun = await createRun(selectedScenario.id);
        activeBackendRunId.current = queuedRun.id;
        const status = await startRun(queuedRun.id);
        const trace = await getRunTrace(queuedRun.id).catch(() => []);
        applyBackendStatus(status, trace);
        pollBackendRun(queuedRun.id);
      } catch {
        activeBackendRunId.current = null;
        startLocalDemo();
      }
    })();
  }, [applyBackendStatus, pollBackendRun, selectedScenario, startLocalDemo]);

  useEffect(() => () => clearTimers(), []);

  const snapshot = useMemo(
    () => ({
      scenario: selectedScenario,
      isRunning,
      isComplete,
      currentIndex: engineRuntime.currentIndex,
      statuses: engineRuntime.statuses,
      logs: engineRuntime.traceEvents.map((event) => ({
        ts: event.ts,
        agent: event.agent,
        message: event.message,
        tone: event.tone,
      })),
      metrics,
      completedExecutions,
      lastCompletedId,
      engineRuntime,
    }),
    [
      selectedScenario,
      isRunning,
      isComplete,
      engineRuntime,
      metrics,
      completedExecutions,
      lastCompletedId,
    ],
  );

  const currentRun = useMemo(() => getCurrentRun(snapshot), [snapshot]);

  const value = useMemo<DemoState>(
    () => ({
      ...snapshot,
      currentRun,
      scenarios: DEMO_SCENARIOS,
      selectedScenarioId,
      selectedScenario,
      selectScenario,
      start,
      reset,
    }),
    [snapshot, currentRun, selectedScenarioId, selectedScenario, selectScenario, start, reset],
  );

  return <DemoCtx.Provider value={value}>{children}</DemoCtx.Provider>;
}

export function useDemo() {
  const ctx = useContext(DemoCtx);
  if (!ctx) throw new Error("useDemo must be used inside DemoProvider");
  return ctx;
}
