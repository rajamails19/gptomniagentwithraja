import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Lightbulb, TrendingDown } from "lucide-react";
import { PageHeader, Panel, StatBadge } from "@/components/ui/page";
import { costByAgent, costByWorkflow, monthlyCost } from "@/lib/mock-data";

export const Route = createFileRoute("/cost")({
  head: () => ({
    meta: [
      { title: "Cost Analytics — AI Agent Studio" },
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

function CostPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Cost Analytics"
        description="Track, attribute and optimize spend across agents, models and workflows."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi k="Today" v="$184.20" delta="+12%" />
        <Kpi k="Month-to-date" v="$3,842" delta="+8%" />
        <Kpi k="Projected month" v="$5,210" delta="-4% vs last" tone="success" />
        <Kpi k="Cost / success" v="$0.024" delta="-$0.003" tone="success" />
      </div>

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
              <YAxis stroke="oklch(0.7 0.03 256)" fontSize={11} tickLine={false} axisLine={false} />
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
              <BarChart data={costByWorkflow} layout="vertical">
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
          <div className="text-sm font-semibold">Cost by agent</div>
          <div className="h-64 mt-3">
            <ResponsiveContainer>
              <BarChart data={costByAgent}>
                <CartesianGrid stroke="oklch(1 0 0 / 0.05)" vertical={false} />
                <XAxis
                  dataKey="name"
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
                <Tooltip contentStyle={tt} />
                <Bar dataKey="cost" fill="oklch(0.72 0.2 250)" radius={[4, 4, 0, 0]} />
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
  k,
  v,
  delta,
  tone = "default" as const,
}: {
  k: string;
  v: string;
  delta: string;
  tone?: "default" | "success" | "warn" | "error" | "info";
}) {
  return (
    <div className="rounded-xl glass p-4">
      <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{k}</div>
      <div className="mt-1 flex items-baseline justify-between">
        <div className="text-2xl font-semibold">{v}</div>
        <StatBadge tone={tone}>{delta}</StatBadge>
      </div>
    </div>
  );
}
