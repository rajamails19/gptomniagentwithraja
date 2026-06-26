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
import { DEMO_EXECUTION, DEMO_NODES, DEMO_SCENARIO } from "@/lib/demo/seed-data";
import { getCurrentRun } from "@/lib/demo/selectors";
import type {
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

const initialStatuses = Object.fromEntries(DEMO_NODES.map((n) => [n.id, "idle"])) as Record<
  DemoNodeId,
  DemoStatus
>;

export function DemoProvider({ children }: { children: ReactNode }) {
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [statuses, setStatuses] = useState<Record<DemoNodeId, DemoStatus>>(initialStatuses);
  const [logs, setLogs] = useState<DemoLog[]>([]);
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
    setCurrentIndex(-1);
    setStatuses(initialStatuses);
    setLogs([]);
  }, []);

  const start = useCallback(() => {
    clearTimers();
    setIsRunning(true);
    setIsComplete(false);
    setCurrentIndex(-1);
    setLogs([]);
    setStatuses(
      Object.fromEntries(DEMO_NODES.map((n) => [n.id, "queued"])) as Record<DemoNodeId, DemoStatus>,
    );

    const stepDelay = 1100;
    DEMO_NODES.forEach((node, i) => {
      timers.current.push(
        setTimeout(() => {
          setCurrentIndex(i);
          setStatuses((prev) => {
            const next = { ...prev } as Record<DemoNodeId, DemoStatus>;
            if (i > 0) next[DEMO_NODES[i - 1].id] = "success";
            next[node.id] = "running";
            return next;
          });
          const ts = new Date().toLocaleTimeString([], { hour12: false });
          const entries = DEMO_SCENARIO.stepMessages[node.id];
          entries.forEach((e, j) => {
            timers.current.push(
              setTimeout(() => {
                setLogs((l) => [...l, { ts, agent: node.agent, message: e.msg, tone: e.tone }]);
              }, j * 220),
            );
          });
          setMetrics((m) => ({
            executions: m.executions + 1,
            tokens: m.tokens + 12_400,
            cost: +(m.cost + 0.18).toFixed(2),
            successRate: Math.min(99.4, +(m.successRate + 0.02).toFixed(2)),
            latency: Math.max(720, m.latency - 4),
          }));
        }, i * stepDelay),
      );
    });

    timers.current.push(
      setTimeout(
        () => {
          setStatuses((prev) => {
            const next = { ...prev } as Record<DemoNodeId, DemoStatus>;
            next[DEMO_NODES[DEMO_NODES.length - 1].id] = "success";
            return next;
          });
          setIsRunning(false);
          setIsComplete(true);
          // Centralized: record this run so all surfaces (Dashboard table,
          // Debugger sidebar) can render it without their own state.
          setCompletedExecutions((prev) =>
            prev.some((e) => e.id === DEMO_EXECUTION.id) ? prev : [{ ...DEMO_EXECUTION }, ...prev],
          );
          setLastCompletedId(DEMO_EXECUTION.id);
        },
        DEMO_NODES.length * stepDelay + 200,
      ),
    );
  }, []);

  useEffect(() => () => clearTimers(), []);

  const snapshot = useMemo(
    () => ({
      isRunning,
      isComplete,
      currentIndex,
      statuses,
      logs,
      metrics,
      completedExecutions,
      lastCompletedId,
    }),
    [
      isRunning,
      isComplete,
      currentIndex,
      statuses,
      logs,
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
