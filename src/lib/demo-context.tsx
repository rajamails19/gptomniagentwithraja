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
import { DEMO_EXECUTION, DEMO_NODES } from "@/lib/demo/seed-data";
import { getCurrentRun } from "@/lib/demo/selectors";
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
  DemoStatus,
  ExecutionRecord,
  TraceTone,
} from "@/lib/demo/types";

export { DEMO_EXECUTION, DEMO_NODES };
export type { DemoNodeId, DemoRun, DemoStatus, ExecutionRecord };

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
  start: () => void;
  reset: () => void;
}

const DemoCtx = createContext<DemoState | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [engineRuntime, setEngineRuntime] = useState<DemoEngineRuntime>(() =>
    createInitialEngineRuntime(),
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

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const reset = useCallback(() => {
    clearTimers();
    setIsRunning(false);
    setIsComplete(false);
    setEngineRuntime(createInitialEngineRuntime());
  }, []);

  const start = useCallback(() => {
    clearTimers();
    setIsRunning(true);
    setIsComplete(false);
    setLastCompletedId(null);
    setEngineRuntime(createQueuedEngineRuntime());

    createScenarioTimeline().forEach((action) => {
      timers.current.push(
        setTimeout(() => {
          const ts = new Date().toLocaleTimeString([], { hour12: false });

          setEngineRuntime((runtime) => applyTimelineAction(runtime, action, ts));

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
              prev.some((e) => e.id === DEMO_EXECUTION.id)
                ? prev
                : [{ ...DEMO_EXECUTION }, ...prev],
            );
            setLastCompletedId(DEMO_EXECUTION.id);
          }
        }, action.at),
      );
    });
  }, []);

  useEffect(() => () => clearTimers(), []);

  const snapshot = useMemo(
    () => ({
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
    [isRunning, isComplete, engineRuntime, metrics, completedExecutions, lastCompletedId],
  );

  const currentRun = useMemo(() => getCurrentRun(snapshot), [snapshot]);

  const value = useMemo<DemoState>(
    () => ({
      ...snapshot,
      currentRun,
      start,
      reset,
    }),
    [snapshot, currentRun, start, reset],
  );

  return <DemoCtx.Provider value={value}>{children}</DemoCtx.Provider>;
}

export function useDemo() {
  const ctx = useContext(DemoCtx);
  if (!ctx) throw new Error("useDemo must be used inside DemoProvider");
  return ctx;
}
