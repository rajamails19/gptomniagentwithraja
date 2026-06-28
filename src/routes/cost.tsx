import { createFileRoute } from "@tanstack/react-router";
import {
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
import {
  ChevronDown,
  ChevronRight,
  Lightbulb,
  TrendingDown,
  Zap,
  DollarSign,
  Clock,
  Cpu,
} from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader, Panel, StatBadge } from "@/components/ui/page";
import { monthlyCost } from "@/lib/mock-data";
import { useDemo } from "@/lib/demo-context";
import { getRuns } from "@/lib/api/client";
import type { ApiRun } from "@/lib/api/schemas";

export const Route = createFileRoute("/cost")({
  head: () => ({
    meta: [
      { title: "Cost Analytics — OmniAgents" },
      {
        name: "description",
        content:
          "Business-friendly AI cost governance: by workflow, agent, model, and projected spend.",
      },
    ],
  }),
  component: CostPage,
});

const tt = {
  background: "oklch(0.18 0.03 264)",
  border: "1px solid oklch(1 0 0 / 0.1)",
  borderRadius: 10,
  fontSize: 12,
};

const MODEL_COLORS: Record<string, string> = {
  "gpt-4o": "oklch(0.72 0.2 250)",
  "gpt-4o-mini": "oklch(0.68 0.22 295)",
  "claude-3.5-sonnet": "oklch(0.82 0.16 210)",
  "claude-3-haiku": "oklch(0.78 0.17 165)",
  "gemini-1.5-pro": "oklch(0.82 0.17 75)",
};
const MODEL_COLOR_LIST = [
  "oklch(0.72 0.2 250)",
  "oklch(0.68 0.22 295)",
  "oklch(0.82 0.16 210)",
  "oklch(0.78 0.17 165)",
  "oklch(0.82 0.17 75)",
];

function CostPage() {
  const demo = useDemo();
  const [apiRuns, setApiRuns] = useState<ApiRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [drillOpen, setDrillOpen] = useState(true);

  useEffect(() => {
    getRuns()
      .then((runs) => {
        setApiRuns(runs);
        // Auto-select the most recent completed run
        const first = runs.find((r) => r.status === "completed") ?? runs[0];
        if (first && !selectedRunId) setSelectedRunId(first.id);
      })
      .catch(() => {});
  }, []);

  // Find the scenario for the selected run
  const selectedRun = apiRuns.find((r) => r.id === selectedRunId);
  const scenario =
    demo.scenarios.find((s) => s.id === selectedRun?.scenarioId) ?? demo.selectedScenario;

  // --- Per-agent breakdown ---
  const agentSteps = scenario.steps.filter((s) => s.kind === "agent");
  const totalCost = scenario.costSummary.totalCost;
  const totalTokens = scenario.costSummary.totalTokens;

  const agentRows = agentSteps.map((step) => ({
    label: step.label.replace(" Agent", ""),
    agent: step.agent,
    model: step.model,
    cost: step.cost,
    tokens: step.tokens,
    latencyMs: step.latencyMs,
    pct: totalCost > 0 ? (step.cost / totalCost) * 100 : 0,
  }));
  agentRows.sort((a, b) => b.cost - a.cost);

  // --- Model allocation ---
  const modelMap = new Map<string, { tokens: number; cost: number }>();
  agentSteps.forEach((step) => {
    const existing = modelMap.get(step.model) ?? { tokens: 0, cost: 0 };
    modelMap.set(step.model, {
      tokens: existing.tokens + step.tokens,
      cost: existing.cost + step.cost,
    });
  });
  const modelRows = Array.from(modelMap.entries())
    .map(([model, data]) => ({
      model,
      tokens: data.tokens,
      cost: data.cost,
      pct: totalCost > 0 ? (data.cost / totalCost) * 100 : 0,
    }))
    .sort((a, b) => b.cost - a.cost);

  // --- Tool call breakdown ---
  const toolRows = scenario.toolCalls.map((tc) => ({
    id: tc.id,
    tool: tc.tool,
    agent: agentSteps.find((s) => s.id === tc.stepId)?.label.replace(" Agent", "") ?? tc.stepId,
    latencyMs: tc.latencyMs,
    status: tc.status,
  }));

  // --- Scenario comparison (workflow level) ---
  const scenarioWorkflowCost = demo.scenarios.map((item) => ({
    name: item.title.replace(" Generation", "").replace(" Investigation", " IR"),
    cost: item.costSummary.totalCost,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cost Analytics"
        description="Track, attribute and optimize spend across agents, models and workflows."
      />

      {/* Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi
          icon={DollarSign}
          k="Total cost"
          v={`$${totalCost.toFixed(2)}`}
          delta="this run"
        />
        <Kpi
          icon={Cpu}
          k="Tokens"
          v={`${(totalTokens / 1000).toFixed(1)}K`}
          delta="est."
        />
        <Kpi
          icon={Clock}
          k="Latency"
          v={`${(scenario.costSummary.latencyMs / 1000).toFixed(0)}s`}
          delta="wall time"
        />
        <Kpi
          icon={Zap}
          k="Model savings"
          v={`${scenario.costSummary.modelSavingsPercent}%`}
          delta="vs GPT-4o baseline"
          tone="success"
        />
      </div>

      {/* Run picker */}
      {apiRuns.length > 0 && (
        <Panel>
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold">Per-run drill-down</div>
            <span className="text-[11px] text-muted-foreground">{apiRuns.length} runs in DB</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {apiRuns.slice(0, 8).map((run) => (
              <button
                key={run.id}
                onClick={() => {
                  setSelectedRunId(run.id);
                  setDrillOpen(true);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all ${
                  selectedRunId === run.id
                    ? "border-[var(--electric)] bg-[var(--electric)]/10 text-[var(--electric)]"
                    : "border-border/60 bg-white/[0.03] text-muted-foreground hover:border-border hover:text-foreground"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    run.status === "completed"
                      ? "bg-[var(--emerald)]"
                      : run.status === "running"
                        ? "bg-[var(--electric)] animate-pulse"
                        : run.status === "failed" || run.status === "rejected"
                          ? "bg-destructive"
                          : "bg-muted-foreground"
                  }`}
                />
                <span>{run.id}</span>
                <span className="text-muted-foreground/60">${run.cost.toFixed(2)}</span>
              </button>
            ))}
          </div>
        </Panel>
      )}

      {/* Drill-down panel */}
      {selectedRun && (
        <Panel className="ring-1 ring-[var(--electric)]/20">
          {/* Header */}
          <button
            className="w-full flex items-center justify-between"
            onClick={() => setDrillOpen((o) => !o)}
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-[var(--electric)]/10 grid place-items-center">
                <DollarSign className="h-4 w-4 text-[var(--electric)]" />
              </div>
              <div className="text-left">
                <div className="text-sm font-semibold font-mono">{selectedRun.id}</div>
                <div className="text-xs text-muted-foreground">
                  {selectedRun.workflow} · {selectedRun.duration} · {selectedRun.started}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-lg font-semibold">${selectedRun.cost.toFixed(2)}</div>
                <div className="text-[11px] text-muted-foreground">
                  {selectedRun.tokens.toLocaleString()} tokens
                </div>
              </div>
              {drillOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </button>

          {drillOpen && (
            <div className="mt-5 space-y-6">
              {/* Agent cost breakdown */}
              <div>
                <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-3">
                  Cost by agent
                </div>
                <div className="space-y-2">
                  {agentRows.map((row, i) => (
                    <div key={row.agent}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{row.label}</span>
                          <span className="text-[10px] px-1.5 py-px rounded bg-white/[0.06] text-muted-foreground font-mono">
                            {row.model}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 tabular-nums">
                          <span className="text-muted-foreground">
                            {row.tokens.toLocaleString()} tok
                          </span>
                          <span className="text-muted-foreground">{row.latencyMs}ms</span>
                          <span className="font-semibold">${row.cost.toFixed(3)}</span>
                          <span className="text-muted-foreground/60 w-9 text-right">
                            {row.pct.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${row.pct}%`,
                            background:
                              MODEL_COLORS[row.model] ??
                              MODEL_COLOR_LIST[i % MODEL_COLOR_LIST.length],
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Model allocation */}
                <div>
                  <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-3">
                    Model allocation
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="h-36 w-36 shrink-0">
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie
                            data={modelRows}
                            dataKey="cost"
                            nameKey="model"
                            cx="50%"
                            cy="50%"
                            innerRadius={30}
                            outerRadius={54}
                            strokeWidth={0}
                          >
                            {modelRows.map((row, i) => (
                              <Cell
                                key={row.model}
                                fill={
                                  MODEL_COLORS[row.model] ??
                                  MODEL_COLOR_LIST[i % MODEL_COLOR_LIST.length]
                                }
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={tt}
                            formatter={(v: number) => [`$${v.toFixed(3)}`, "cost"]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-2 flex-1">
                      {modelRows.map((row, i) => (
                        <div key={row.model} className="flex items-center gap-2 text-xs">
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{
                              background:
                                MODEL_COLORS[row.model] ??
                                MODEL_COLOR_LIST[i % MODEL_COLOR_LIST.length],
                            }}
                          />
                          <span className="font-mono text-[10px] text-muted-foreground flex-1 truncate">
                            {row.model}
                          </span>
                          <span className="font-semibold tabular-nums">
                            {row.pct.toFixed(0)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Tool call table */}
                <div>
                  <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-3">
                    Tool calls ({toolRows.length})
                  </div>
                  <div className="rounded-lg border border-border/60 overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border/60 bg-white/[0.02]">
                          <th className="text-left px-3 py-2 text-muted-foreground font-medium">
                            Tool
                          </th>
                          <th className="text-left px-3 py-2 text-muted-foreground font-medium hidden sm:table-cell">
                            Agent
                          </th>
                          <th className="text-right px-3 py-2 text-muted-foreground font-medium">
                            Latency
                          </th>
                          <th className="text-right px-3 py-2 text-muted-foreground font-medium">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {toolRows.map((row) => (
                          <tr
                            key={row.id}
                            className="border-t border-border/40 hover:bg-white/[0.02]"
                          >
                            <td className="px-3 py-1.5 font-mono text-[11px]">{row.tool}</td>
                            <td className="px-3 py-1.5 text-muted-foreground hidden sm:table-cell">
                              {row.agent}
                            </td>
                            <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">
                              {row.latencyMs}ms
                            </td>
                            <td className="px-3 py-1.5 text-right">
                              <span
                                className={`px-1.5 py-px rounded text-[10px] font-semibold ${
                                  row.status === "success"
                                    ? "bg-[var(--emerald)]/15 text-[var(--emerald)]"
                                    : row.status === "retry"
                                      ? "bg-[var(--amber)]/15 text-[var(--amber)]"
                                      : "bg-destructive/15 text-destructive"
                                }`}
                              >
                                {row.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Cost efficiency */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border/60">
                <MiniStat
                  label="Cost / 1K tokens"
                  value={`$${totalTokens > 0 ? ((totalCost / totalTokens) * 1000).toFixed(4) : "—"}`}
                />
                <MiniStat
                  label="Manual hours saved"
                  value={scenario.costSummary.estimatedManualHours}
                />
                <MiniStat
                  label="Agents used"
                  value={String(agentSteps.length)}
                />
                <MiniStat
                  label="Tool calls"
                  value={String(toolRows.length)}
                />
              </div>
            </div>
          )}
        </Panel>
      )}

      {/* Aggregate charts */}
      <Panel>
        <div className="text-sm font-semibold">Daily spend · last 30 days</div>
        <div className="h-64 mt-3">
          <ResponsiveContainer>
            <LineChart data={monthlyCost}>
              <CartesianGrid stroke="oklch(1 0 0 / 0.05)" vertical={false} />
              <XAxis
                dataKey="day"
                stroke="oklch(0.7 0.03 256)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="oklch(0.7 0.03 256)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip contentStyle={tt} />
              <Line
                type="monotone"
                dataKey="cost"
                stroke="oklch(0.72 0.2 250)"
                strokeWidth={2.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel>
          <div className="text-sm font-semibold">Cost by workflow</div>
          <div className="h-64 mt-3">
            <ResponsiveContainer>
              <BarChart data={scenarioWorkflowCost} layout="vertical">
                <CartesianGrid stroke="oklch(1 0 0 / 0.05)" horizontal={false} />
                <XAxis
                  type="number"
                  stroke="oklch(0.7 0.03 256)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="oklch(0.7 0.03 256)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={80}
                />
                <Tooltip contentStyle={tt} />
                <Bar dataKey="cost" fill="oklch(0.68 0.22 295)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel>
          <div className="text-sm font-semibold">Agent cost · selected scenario</div>
          <div className="h-64 mt-3">
            <ResponsiveContainer>
              <BarChart data={agentRows}>
                <CartesianGrid stroke="oklch(1 0 0 / 0.05)" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="oklch(0.7 0.03 256)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  angle={-20}
                  dy={10}
                  height={50}
                  interval={0}
                />
                <YAxis
                  stroke="oklch(0.7 0.03 256)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip contentStyle={tt} formatter={(v: number) => [`$${v.toFixed(3)}`, "cost"]} />
                <Bar dataKey="cost" radius={[4, 4, 0, 0]}>
                  {agentRows.map((row, i) => (
                    <Cell
                      key={row.agent}
                      fill={MODEL_COLORS[row.model] ?? MODEL_COLOR_LIST[i % MODEL_COLOR_LIST.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Panel>
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-[var(--amber)]" />
          <div className="text-sm font-semibold">Savings suggestions</div>
        </div>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { title: "Route 38% of Reviewer calls to gpt-4o-mini", save: "$182 / mo" },
            { title: "Cache Research Agent retrievals (TTL 24h)", save: "$94 / mo" },
            { title: "Compress system prompts (Planner v4.2)", save: "$61 / mo" },
          ].map((s) => (
            <div key={s.title} className="rounded-xl bg-white/[0.03] border border-border/60 p-4">
              <div className="text-sm font-medium">{s.title}</div>
              <div className="mt-2 flex items-center gap-2 text-xs">
                <TrendingDown className="h-3.5 w-3.5 text-[var(--emerald)]" />
                <span className="text-[var(--emerald)] font-semibold">{s.save}</span>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function Kpi({
  icon: Icon,
  k,
  v,
  delta,
  tone = "default" as const,
}: {
  icon: React.ElementType;
  k: string;
  v: string;
  delta: string;
  tone?: "default" | "success" | "warn" | "error" | "info";
}) {
  return (
    <div className="rounded-xl glass p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{k}</div>
      </div>
      <div className="flex items-baseline justify-between">
        <div className="text-2xl font-semibold">{v}</div>
        <StatBadge tone={tone}>{delta}</StatBadge>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/[0.03] border border-border/60 px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}
