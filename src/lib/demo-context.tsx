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

export type DemoStatus = "idle" | "queued" | "running" | "success" | "error";

export const DEMO_NODES = [
  { id: "user", label: "User Request", agent: "—" },
  { id: "planner", label: "Planner", agent: "Planner Agent" },
  { id: "research", label: "Research", agent: "Research Agent" },
  { id: "code", label: "Code", agent: "Code Agent" },
  { id: "docs", label: "Documentation", agent: "Documentation Agent" },
  { id: "qa", label: "QA", agent: "QA/Test Agent" },
  { id: "reviewer", label: "Reviewer", agent: "Reviewer Agent" },
  { id: "final", label: "Final Output", agent: "—" },
] as const;

export type DemoNodeId = (typeof DEMO_NODES)[number]["id"];

export interface DemoLog {
  ts: string;
  agent: string;
  message: string;
  tone: "info" | "success" | "warn" | "error";
}

// Centralized record for any completed run. Swap this for a real execution
// engine later — both Dashboard and Debugger read from `completedExecutions`.
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

// Stable values for the canned demo run so multiple surfaces stay consistent.
export const DEMO_EXECUTION: ExecutionRecord = {
  id: "exec_8a22",
  workflow: "Demo Run · all agents",
  status: "success",
  duration: "58s",
  tokens: 68420,
  cost: 1.24,
  started: "just now",
  isDemo: true,
};

interface DemoState {
  isRunning: boolean;
  isComplete: boolean;
  currentIndex: number;
  statuses: Record<DemoNodeId, DemoStatus>;
  logs: DemoLog[];
  metrics: {
    executions: number;
    tokens: number;
    cost: number;
    successRate: number;
    latency: number;
  };
  completedExecutions: ExecutionRecord[];
  lastCompletedId: string | null;
  start: () => void;
  reset: () => void;
}

const DemoCtx = createContext<DemoState | null>(null);

const initialStatuses = Object.fromEntries(DEMO_NODES.map((n) => [n.id, "idle"])) as Record<
  DemoNodeId,
  DemoStatus
>;

const stepMessages: Record<DemoNodeId, { msg: string; tone: DemoLog["tone"] }[]> = {
  user: [{ msg: "Goal received: Create API documentation for payments service", tone: "info" }],
  planner: [
    { msg: "Decomposing goal into 6 subtasks", tone: "info" },
    { msg: "Dependency graph built · routed to 5 agents", tone: "success" },
  ],
  research: [
    { msg: "RAG retrieve openapi://payments@v4.2 · 0.94 similarity", tone: "info" },
    { msg: "Retrieved 14 context chunks (1,284 tokens)", tone: "success" },
  ],
  code: [
    { msg: "Scanning /api/payments/* route handlers", tone: "info" },
    { msg: "Found 12 endpoints · extracted Zod schemas", tone: "success" },
  ],
  docs: [
    { msg: "Drafting markdown reference v1", tone: "info" },
    { msg: "ToolTimeoutError schema_to_md > 2500ms · retry in 600ms", tone: "warn" },
    { msg: "Draft v2 complete · 18.4KB markdown", tone: "success" },
  ],
  qa: [
    { msg: "Running checklist · 14 items", tone: "info" },
    { msg: "QA passed 14/14 · added error-code table", tone: "success" },
  ],
  reviewer: [
    { msg: "Style guide v3.2 enforced · 3 micro edits", tone: "info" },
    { msg: "Approved · risk = low", tone: "success" },
  ],
  final: [{ msg: "Artifact published · payments-api-v4.2.md", tone: "success" }],
};

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
          const entries = stepMessages[node.id];
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

  const value = useMemo<DemoState>(
    () => ({
      isRunning,
      isComplete,
      currentIndex,
      statuses,
      logs,
      metrics,
      completedExecutions,
      lastCompletedId,
      start,
      reset,
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
      start,
      reset,
    ],
  );

  return <DemoCtx.Provider value={value}>{children}</DemoCtx.Provider>;
}

export function useDemo() {
  const ctx = useContext(DemoCtx);
  if (!ctx) throw new Error("useDemo must be used inside DemoProvider");
  return ctx;
}
