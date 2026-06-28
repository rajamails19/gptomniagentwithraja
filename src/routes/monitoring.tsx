import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, Loader2 } from "lucide-react";
import {
  EmptyState,
  PageHeader,
  Panel,
  StatBadge,
  StatusBadge,
  StatusDot,
} from "@/components/ui/page";
import { getRuns, type ApiRun } from "@/lib/api/client";
import { useDemo } from "@/lib/demo-context";

export const Route = createFileRoute("/monitoring")({
  head: () => ({
    meta: [
      { title: "Monitoring — OmniAgents" },
      {
        name: "description",
        content: "Live observability for agents, latency, tokens, costs, errors and queues.",
      },
    ],
  }),
  component: MonitoringPage,
});

// ── helpers ────────────────────────────────────────────────────────────────────

type RunSeries = { label: string; latency: number; tokens: number; cost: number };

function buildSeries(runs: ApiRun[]): RunSeries[] {
  return runs.slice(-12).map((r, i) => ({
    label: `R${i + 1}`,
    latency: Math.round(r.costSummary.latencyMs / 1000),
    tokens: r.costSummary.totalTokens,
    cost: parseFloat(r.costSummary.totalCost.toFixed(4)),
  }));
}

type ModelSlice = { name: string; value: number; color: string };

const MODEL_COLORS: Record<string, string> = {
  "gpt-4o": "oklch(0.72 0.2 250)",
  "claude-3.5-sonnet": "oklch(0.68 0.22 295)",
  "gemini-1.5-pro": "oklch(0.72 0.22 145)",
  "llama-3.1-70b": "oklch(0.65 0.18 35)",
};

// Distribute tokens across models using a deterministic ratio based on the
// scenario step agents (planner→gpt-4o, research→claude, code→gemini, etc.)
const MODEL_RATIOS: Array<[string, number]> = [
  ["gpt-4o", 0.45],
  ["claude-3.5-sonnet", 0.30],
  ["gemini-1.5-pro", 0.20],
  ["llama-3.1-70b", 0.05],
];

function buildModelBreakdown(runs: ApiRun[]): ModelSlice[] {
  const totalTokens = runs.reduce((s, r) => s + r.costSummary.totalTokens, 0);
  if (totalTokens === 0) return [];
  return MODEL_RATIOS.map(([name, ratio]) => ({
    name,
    value: Math.round(totalTokens * ratio),
    color: MODEL_COLORS[name] ?? "oklch(0.7 0.1 260)",
  }));
}

type Alert = { kind: string; detail: string; severity: "error" | "warn" };

function buildAlerts(runs: ApiRun[]): Alert[] {
  const alerts: Alert[] = [];
  for (const r of runs) {
    if (r.status === "failed" || r.status === "error") {
      alerts.push({
        kind: "Run failed",
        detail: `Run ${r.id.slice(0, 8)} · ${r.workflow} · ${r.duration}`,
        severity: "error",
      });
    } else if (r.status === "rejected") {
      alerts.push({
        kind: "Approval rejected",
        detail: `Run ${r.id.slice(0, 8)} · ${r.workflow}`,
        severity: "warn",
      });
    } else if (r.status === "cancelled") {
      alerts.push({
        kind: "Run cancelled",
        detail: `Run ${r.id.slice(0, 8)} · ${r.workflow}`,
        severity: "warn",
      });
    }
  }
  return alerts.slice(0, 6);
}

type AgentRow = { id: string; name: string; status: "active" | "idle" | "error"; latencyMs: number; health: number };

function buildAgents(runs: ApiRun[], demo: { selectedScenario: { steps: Array<{ agent: string }> } }): AgentRow[] {
  const activeAgentNames = new Set(
    demo.selectedScenario.steps.filter((s) => s.agent !== "—").map((s) => s.agent),
  );

  const runningRun = runs.find((r) => r.status === "running" || r.status === "queued");
  const failedCount = runs.filter((r) => r.status === "failed" || r.status === "error").length;
  const avgRunLatency =
    runs.length > 0
      ? Math.round(runs.reduce((s, r) => s + r.costSummary.latencyMs, 0) / runs.length)
      : 0;

  const allAgentNames = Array.from(activeAgentNames);

  return allAgentNames.map((name, i) => {
    const isRunning = !!runningRun;
    const hasError = i === 0 && failedCount > 0;
    // Each agent gets a slice of the avg run latency (first agent takes more)
    const agentLatency = avgRunLatency > 0 ? Math.round(avgRunLatency * (1 - i * 0.12)) : 120 + i * 30;
    const health = hasError ? 85 : isRunning ? 98 : 99;
    return {
      id: `agent-${i}`,
      name,
      status: hasError ? "error" : isRunning ? "active" : ("idle" as const),
      latencyMs: Math.max(agentLatency, 40),
      health,
    };
  });
}

// ── component ──────────────────────────────────────────────────────────────────

function MonitoringPage() {
  const demo = useDemo();
  const [runs, setRuns] = useState<ApiRun[] | null>(null);

  useEffect(() => {
    getRuns()
      .then(setRuns)
      .catch(() => setRuns([]));
  }, [demo.lastCompletedId]);

  const scenario = demo.selectedScenario;

  if (runs === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const series = buildSeries(runs);
  const modelBreakdown = buildModelBreakdown(runs);
  const alerts = buildAlerts(runs);
  const agents = buildAgents(runs, demo);

  const totalRuns = runs.length;
  const failedRuns = runs.filter((r) => r.status === "failed" || r.status === "error" || r.status === "rejected").length;
  const totalTokens = runs.reduce((s, r) => s + r.costSummary.totalTokens, 0);
  const avgCost =
    runs.length > 0
      ? runs.reduce((s, r) => s + r.costSummary.totalCost, 0) / runs.length
      : 0;

  const kpis = [
    { k: "Total runs", v: String(totalRuns), t: "info" as const },
    { k: "Failed / rejected", v: String(failedRuns), t: failedRuns > 0 ? ("warn" as const) : ("success" as const) },
    { k: "Total tokens", v: totalTokens > 1000 ? `${(totalTokens / 1000).toFixed(1)}k` : String(totalTokens), t: "success" as const },
    { k: "Avg cost / run", v: `$${avgCost.toFixed(4)}`, t: "info" as const },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monitoring"
        description="Real-time observability for agents, tools, models and queues."
        actions={
          <span className="text-[10px] text-muted-foreground font-mono px-2 py-0.5 rounded border border-border/60">
            {totalRuns} runs · SQLite
          </span>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((s) => (
          <div
            key={s.k}
            className="rounded-xl glass p-4 transition-[border-color,transform,background] duration-200 hover:-translate-y-px hover:border-white/15"
          >
            <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{s.k}</div>
            <div className="mt-1 flex items-baseline justify-between">
              <div className="text-2xl font-semibold">{s.v}</div>
              <StatBadge tone={s.t}>live</StatBadge>
            </div>
          </div>
        ))}
      </div>

      {/* Agent grid */}
      <Panel>
        <div className="text-sm font-semibold">Live agent status</div>
        <div className="text-xs text-muted-foreground">
          Agents registered in the active scenario
        </div>
        <div className="mt-3 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2">
          {agents.length > 0 ? (
            agents.map((a) => (
              <div
                key={a.id}
                className="rounded-lg glass p-3 text-xs transition-[background,transform] duration-200 hover:-translate-y-px hover:bg-white/[0.05]"
              >
                <div className="flex items-center gap-2">
                  <StatusDot status={a.status} />
                  <span className="font-medium truncate">{a.name.replace(" Agent", "")}</span>
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {a.latencyMs}ms · {a.health}%
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full">
              <EmptyState title="No agents found." description="Trigger a run to see agent status." />
            </div>
          )}
        </div>
      </Panel>

      {/* Charts */}
      {series.length === 0 ? (
        <Panel>
          <EmptyState
            title="No run data yet."
            description="Trigger a run from the Workflow page — charts will populate with real latency, token, and cost data from SQLite."
          />
        </Panel>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Panel>
            <div className="text-sm font-semibold">Latency per run (s)</div>
            <div className="h-48 mt-3">
              <ResponsiveContainer>
                <LineChart data={series}>
                  <CartesianGrid stroke="oklch(1 0 0 / 0.05)" vertical={false} />
                  <XAxis dataKey="label" stroke="oklch(0.7 0.03 256)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="oklch(0.7 0.03 256)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tt} />
                  <Line type="monotone" dataKey="latency" stroke="oklch(0.82 0.16 210)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Panel>
          <Panel>
            <div className="text-sm font-semibold">Tokens per run</div>
            <div className="h-48 mt-3">
              <ResponsiveContainer>
                <AreaChart data={series}>
                  <defs>
                    <linearGradient id="tk" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.72 0.2 250)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="oklch(0.72 0.2 250)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="oklch(1 0 0 / 0.05)" vertical={false} />
                  <XAxis dataKey="label" stroke="oklch(0.7 0.03 256)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="oklch(0.7 0.03 256)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tt} />
                  <Area type="monotone" dataKey="tokens" stroke="oklch(0.72 0.2 250)" fill="url(#tk)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>
          <Panel>
            <div className="text-sm font-semibold">Cost per run ($)</div>
            <div className="h-48 mt-3">
              <ResponsiveContainer>
                <BarChart data={series}>
                  <CartesianGrid stroke="oklch(1 0 0 / 0.05)" vertical={false} />
                  <XAxis dataKey="label" stroke="oklch(0.7 0.03 256)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="oklch(0.7 0.03 256)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tt} />
                  <Bar dataKey="cost" fill="oklch(0.68 0.22 295)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>
      )}

      {/* Model breakdown + Alerts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel>
          <div className="text-sm font-semibold">Model token usage</div>
          {modelBreakdown.length === 0 ? (
            <div className="mt-3">
              <EmptyState title="No model data." description="Run a scenario to see model breakdown." />
            </div>
          ) : (
            <>
              <div className="h-56 mt-3">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={modelBreakdown} dataKey="value" innerRadius={50} outerRadius={90} paddingAngle={3} stroke="none">
                      {modelBreakdown.map((m, i) => (
                        <Cell key={i} fill={m.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tt} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-3 mt-2">
                {modelBreakdown.map((m) => (
                  <div key={m.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ background: m.color }} />
                    {m.name}
                  </div>
                ))}
              </div>
            </>
          )}
        </Panel>
        <Panel>
          <div className="text-sm font-semibold mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-[var(--amber)]" /> Active alerts
          </div>
          <div className="space-y-2">
            {alerts.length > 0 ? (
              alerts.map((a, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg border border-border/60 bg-white/[0.03] p-3 transition-[background,border-color,transform] duration-200 hover:-translate-y-px hover:bg-white/[0.05]"
                >
                  <StatusDot status={a.severity === "error" ? "error" : "queued"} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{a.kind}</div>
                    <div className="text-xs text-muted-foreground truncate">{a.detail}</div>
                  </div>
                  <StatusBadge status={a.severity === "error" ? "failed" : "retrying"} />
                </div>
              ))
            ) : (
              <EmptyState
                title="No active alerts."
                description="Failed, rejected, or cancelled runs will surface here with severity context."
              />
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}

const tt = {
  background: "oklch(0.18 0.03 264)",
  border: "1px solid oklch(1 0 0 / 0.1)",
  borderRadius: 10,
  fontSize: 12,
};
