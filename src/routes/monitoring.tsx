import { createFileRoute } from "@tanstack/react-router";
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
import { AlertTriangle } from "lucide-react";
import {
  EmptyState,
  LoadingState,
  PageHeader,
  Panel,
  StatBadge,
  StatusBadge,
  StatusDot,
} from "@/components/ui/page";
import { agents, alerts, dashboardSeries, modelBreakdown } from "@/lib/mock-data";
import { useDemo } from "@/lib/demo-context";

export const Route = createFileRoute("/monitoring")({
  head: () => ({
    meta: [
      { title: "Monitoring — GPT Omni Agents" },
      {
        name: "description",
        content: "Live observability for agents, latency, tokens, costs, errors and queues.",
      },
    ],
  }),
  component: MonitoringPage,
});

function MonitoringPage() {
  const demo = useDemo();
  const scenario = demo.selectedScenario;
  const activeAgents = new Set(
    scenario.steps.filter((step) => step.agent !== "—").map((step) => step.agent),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monitoring"
        description="Real-time observability for agents, tools, models and queues."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { k: "Scenario agents", v: String(activeAgents.size), t: "info" as const },
          {
            k: "Retry events",
            v: String(
              Object.values(scenario.stepMessages)
                .flat()
                .filter((m) => m.type === "retry").length,
            ),
            t: "warn" as const,
          },
          {
            k: "Trace events",
            v: String(Object.values(scenario.stepMessages).flat().length),
            t: "success" as const,
          },
          {
            k: "Est. latency",
            v: `${(scenario.costSummary.latencyMs / 1000).toFixed(0)}s`,
            t: "info" as const,
          },
        ].map((s) => (
          <div
            key={s.k}
            className="rounded-xl glass p-4 transition-[border-color,transform,background] duration-200 hover:-translate-y-px hover:border-white/15"
          >
            <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              {s.k}
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <div className="text-2xl font-semibold">{s.v}</div>
              <StatBadge tone={s.t}>live</StatBadge>
            </div>
          </div>
        ))}
      </div>

      <Panel>
        <div className="text-sm font-semibold">Live agent status</div>
        <div className="text-xs text-muted-foreground">
          All registered agents in current environment
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
              <LoadingState label="Loading registered agents" />
            </div>
          )}
        </div>
      </Panel>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Panel>
          <div className="text-sm font-semibold">Latency</div>
          <div className="h-48 mt-3">
            <ResponsiveContainer>
              <LineChart data={dashboardSeries}>
                <CartesianGrid stroke="oklch(1 0 0 / 0.05)" vertical={false} />
                <XAxis
                  dataKey="hour"
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
                  dataKey="latency"
                  stroke="oklch(0.82 0.16 210)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel>
          <div className="text-sm font-semibold">Tokens</div>
          <div className="h-48 mt-3">
            <ResponsiveContainer>
              <AreaChart data={dashboardSeries}>
                <defs>
                  <linearGradient id="tk" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.72 0.2 250)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="oklch(0.72 0.2 250)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="oklch(1 0 0 / 0.05)" vertical={false} />
                <XAxis
                  dataKey="hour"
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
                <Area
                  type="monotone"
                  dataKey="tokens"
                  stroke="oklch(0.72 0.2 250)"
                  fill="url(#tk)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel>
          <div className="text-sm font-semibold">Cost</div>
          <div className="h-48 mt-3">
            <ResponsiveContainer>
              <BarChart data={dashboardSeries}>
                <CartesianGrid stroke="oklch(1 0 0 / 0.05)" vertical={false} />
                <XAxis
                  dataKey="hour"
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
                <Bar dataKey="cost" fill="oklch(0.68 0.22 295)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel>
          <div className="text-sm font-semibold">Model usage breakdown</div>
          <div className="h-56 mt-3">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={modelBreakdown}
                  dataKey="value"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={3}
                  stroke="none"
                >
                  {modelBreakdown.map((m, i) => (
                    <Cell key={i} fill={m.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tt} />
              </PieChart>
            </ResponsiveContainer>
          </div>
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
                description="When queues, tools, or agents need attention, alerts will appear here with severity and ownership context."
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
