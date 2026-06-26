import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Activity,
  Bot,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  Cpu,
  GitBranch,
  Layers,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  XCircle,
  Zap,
  PlayCircle,
  ArrowRight,
  FileText,
  Bug,
} from "lucide-react";
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
import { Panel, StatBadge, StatusDot } from "@/components/ui/page";
import { agents, dashboardSeries, modelBreakdown, recentExecutions } from "@/lib/mock-data";
import { DEMO_NODES, useDemo } from "@/lib/demo-context";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — GPT Omni Agents" },
      {
        name: "description",
        content:
          "AI agent control room for planning, execution, debugging, monitoring, and governance.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const demo = useDemo();
  const currentRun = demo.currentRun;
  const executionsRef = useRef<HTMLDivElement | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const prevCompletedId = useRef<string | null>(null);

  // When a new run finishes, scroll to the table and pulse the new row for 2s.
  useEffect(() => {
    if (demo.lastCompletedId && demo.lastCompletedId !== prevCompletedId.current) {
      prevCompletedId.current = demo.lastCompletedId;
      setHighlightId(demo.lastCompletedId);
      // Wait a tick so the row mounts before scrolling.
      const scrollT = setTimeout(() => {
        executionsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
      const clearT = setTimeout(() => setHighlightId(null), 2200);
      return () => {
        clearTimeout(scrollT);
        clearTimeout(clearT);
      };
    }
  }, [demo.lastCompletedId]);

  const stats = [
    {
      label: "Executions today",
      value: demo.metrics.executions.toLocaleString(),
      delta: "+18.4%",
      icon: Activity,
      tone: "info" as const,
    },
    {
      label: "Active agents",
      value: "10 / 12",
      delta: "2 idle",
      icon: Bot,
      tone: "default" as const,
    },
    {
      label: "Success rate",
      value: `${demo.metrics.successRate.toFixed(1)}%`,
      delta: "+0.4%",
      icon: CheckCircle2,
      tone: "success" as const,
    },
    {
      label: "Avg latency",
      value: `${demo.metrics.latency}ms`,
      delta: "-62ms",
      icon: Clock,
      tone: "info" as const,
    },
    {
      label: "Token usage",
      value: `${(demo.metrics.tokens / 1_000_000).toFixed(2)}M`,
      delta: "+12%",
      icon: Cpu,
      tone: "default" as const,
    },
    {
      label: "Estimated cost",
      value: `$${demo.metrics.cost.toLocaleString()}`,
      delta: "+$142",
      icon: CircleDollarSign,
      tone: "warn" as const,
    },
    { label: "Failed workflows", value: "21", delta: "-9", icon: XCircle, tone: "error" as const },
    {
      label: "Running workflows",
      value: demo.isRunning ? "5" : "4",
      delta: "live",
      icon: PlayCircle,
      tone: "info" as const,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hero / demo banner */}
      <div className="relative overflow-hidden rounded-2xl glass-strong p-6 lg:p-8">
        <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-[oklch(0.7_0.22_270/0.25)] blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[oklch(0.7_0.18_210/0.2)] blur-3xl pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row lg:items-center gap-6 lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2">
              <StatBadge tone="info">
                <Zap className="h-3 w-3" /> Live
              </StatBadge>
              <span className="text-xs text-muted-foreground">
                Updated 2s ago · Dev environment
              </span>
            </div>
            <h2 className="mt-3 text-2xl lg:text-3xl font-semibold tracking-tight">
              <span className="text-gradient">Design, run, debug, and monitor</span>
              <br />
              multi-agent AI workflows.
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              GPT Omni Agents demonstrates how modern AI systems use a planner, orchestrator,
              specialized sub-agents, tools, memory, debugging, monitoring, and cost governance to
              run production-grade workflows.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {demo.isRunning ? (
                <Button
                  onClick={demo.reset}
                  className="h-10 bg-white/5 hover:bg-white/10 border border-border/60 text-foreground"
                >
                  <RotateCcw className="h-4 w-4 mr-1.5" /> Stop demo
                </Button>
              ) : (
                <Button
                  onClick={demo.start}
                  className="h-10 px-5 bg-gradient-to-r from-[var(--electric)] to-[var(--violet)] text-white border-0"
                >
                  <Play className="h-4 w-4 mr-1.5" /> Run Demo Workflow
                </Button>
              )}
              <Button
                asChild
                className="h-10 bg-white/5 hover:bg-white/10 border border-border/60 text-foreground"
              >
                <Link to="/debugger">
                  <Bug className="h-4 w-4 mr-1.5" /> View in Debugger
                </Link>
              </Button>
              <Button
                asChild
                className="h-10 bg-white/5 hover:bg-white/10 border border-border/60 text-foreground"
              >
                <Link to="/workflow">
                  <FileText className="h-4 w-4 mr-1.5" /> View Final Artifact
                </Link>
              </Button>
              <span className="text-xs text-muted-foreground">
                User → Planner → Research → Code → Docs → QA → Reviewer → Final
              </span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:min-w-[420px]">
            {[
              { k: "Workflows", v: "284" },
              { k: "Agents", v: "12" },
              { k: "Models", v: "4" },
            ].map((s) => (
              <div key={s.k} className="rounded-xl glass p-3 text-center min-w-0">
                <div className="text-xl sm:text-2xl font-semibold">{s.v}</div>
                <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  {s.k}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Demo strip */}
        {(demo.isRunning || demo.isComplete) && (
          <div className="relative mt-6 rounded-xl glass p-4 border border-[var(--electric)]/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  Live demo trace
                </div>
                <div className="text-sm font-medium">
                  {demo.isComplete
                    ? "Workflow completed and approved"
                    : "Agents are executing the documentation workflow"}
                </div>
              </div>
              <StatBadge tone={demo.isComplete ? "success" : "info"}>
                {demo.isComplete ? "Success" : "Running live"}
              </StatBadge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
              {DEMO_NODES.map((n, i) => {
                const s = demo.statuses[n.id];
                return (
                  <div
                    key={n.id}
                    className={`rounded-lg p-2 border text-[11px] transition ${s === "running" ? "border-[var(--electric)]/60 bg-[var(--electric)]/10 glow-primary" : s === "success" ? "border-[var(--emerald)]/40 bg-[var(--emerald)]/5" : "border-border/60 bg-white/[0.02]"}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <StatusDot
                        status={
                          s === "success"
                            ? "success"
                            : s === "running"
                              ? "running"
                              : s === "queued"
                                ? "queued"
                                : "idle"
                        }
                      />
                      <span className="font-medium truncate">
                        {i + 1}. {n.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 max-h-32 overflow-auto font-mono text-[11px] space-y-0.5">
              {demo.logs.length === 0 ? (
                <div className="rounded-lg border border-border/60 bg-white/[0.03] p-3 text-muted-foreground">
                  Waiting for the first agent event...
                </div>
              ) : (
                currentRun.traceEvents.slice(-6).map((event) => (
                  <div key={event.id} className="flex gap-2">
                    <span className="text-muted-foreground">[{event.ts}]</span>
                    <span className="text-[var(--electric)]">{event.agent}</span>
                    <span
                      className={
                        event.tone === "warn"
                          ? "text-[var(--amber)]"
                          : event.tone === "success"
                            ? "text-[var(--emerald)]"
                            : event.tone === "error"
                              ? "text-[var(--destructive)]"
                              : "text-muted-foreground"
                      }
                    >
                      {event.message}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-xl glass p-4">
              <div className="flex items-center justify-between">
                <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  {s.label}
                </div>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2 flex items-baseline justify-between gap-2">
                <div className="text-2xl font-semibold tracking-tight tabular-nums">{s.value}</div>
                <StatBadge tone={s.tone}>{s.delta}</StatBadge>
              </div>
            </div>
          );
        })}
      </div>

      {/* Business value */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            icon: Sparkles,
            title: "10× faster documentation",
            body: "Multi-agent pipeline ships production-grade docs in <60s instead of 4–6 hours of manual writing.",
          },
          {
            icon: CircleDollarSign,
            title: "32% lower AI cost",
            body: "Cost-router downgrades safe steps to cheaper models — saved $1.2K last week alone.",
          },
          {
            icon: ShieldCheck,
            title: "Safer, audited output",
            body: "Reviewer + QA + Security agents gate every artifact. Zero PII leaks in last 200 traces.",
          },
        ].map((c) => (
          <div key={c.title} className="rounded-2xl glass-strong p-5 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-[oklch(0.7_0.2_265/0.18)] blur-2xl pointer-events-none" />
            <div className="relative">
              <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-[var(--electric)]/30 to-[var(--violet)]/30 grid place-items-center">
                <c.icon className="h-4 w-4 text-[var(--cyan)]" />
              </div>
              <div className="mt-3 text-sm font-semibold">{c.title}</div>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{c.body}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Architecture explanation */}
      <Panel>
        <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
          <div>
            <div className="text-sm font-semibold flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-[var(--electric)]" /> Architecture at a glance
            </div>
            <div className="text-xs text-muted-foreground">
              How requests flow through the studio.
            </div>
          </div>
          <StatBadge tone="info">Multi-agent system</StatBadge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {[
            { t: "Planner", d: "Breaks goal into tasks", icon: Layers },
            { t: "Orchestrator", d: "Routes tasks to agents", icon: GitBranch },
            { t: "Sub-Agents", d: "Execute specialized work", icon: Bot },
            { t: "Debugger", d: "Traces failures & retries", icon: Sparkles },
            { t: "Monitoring", d: "Tracks production health", icon: Activity },
            { t: "Cost Analytics", d: "Controls spend", icon: CircleDollarSign },
          ].map((l, i, arr) => (
            <div key={l.t} className="relative">
              <div className="rounded-xl glass p-4 h-full">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-md bg-white/[0.06] grid place-items-center">
                    <l.icon className="h-3.5 w-3.5 text-[var(--cyan)]" />
                  </div>
                  <div className="text-sm font-medium">{l.t}</div>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">{l.d}</p>
              </div>
              {i < arr.length - 1 && (
                <ArrowRight className="hidden xl:block absolute top-1/2 -right-2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
              )}
            </div>
          ))}
        </div>
      </Panel>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Panel className="xl:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Cost & token throughput</div>
              <div className="text-xs text-muted-foreground">Last 24 hours</div>
            </div>
            <StatBadge tone="info">
              <TrendingUp className="h-3 w-3" /> +12%
            </StatBadge>
          </div>
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dashboardSeries}>
                <defs>
                  <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.72 0.2 250)" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="oklch(0.72 0.2 250)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g2" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.68 0.22 295)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="oklch(0.68 0.22 295)" stopOpacity={0} />
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
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.18 0.03 264)",
                    border: "1px solid oklch(1 0 0 / 0.1)",
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="tokens"
                  stroke="oklch(0.72 0.2 250)"
                  fill="url(#g1)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="cost"
                  stroke="oklch(0.68 0.22 295)"
                  fill="url(#g2)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel>
          <div className="text-sm font-semibold">Model usage</div>
          <div className="text-xs text-muted-foreground">Share of token volume</div>
          <div className="h-64 mt-2">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={modelBreakdown}
                  dataKey="value"
                  innerRadius={56}
                  outerRadius={86}
                  paddingAngle={3}
                  stroke="none"
                >
                  {modelBreakdown.map((m, i) => (
                    <Cell key={i} fill={m.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.18 0.03 264)",
                    border: "1px solid oklch(1 0 0 / 0.1)",
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {modelBreakdown.map((m) => (
              <div key={m.name} className="flex items-center gap-2 text-xs">
                <span className="h-2 w-2 rounded-full" style={{ background: m.color }} />
                <span className="text-muted-foreground">{m.name}</span>
                <span className="ml-auto font-medium">{m.value}%</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Panel>
          <div className="text-sm font-semibold">Latency p50/p95</div>
          <div className="text-xs text-muted-foreground">Rolling 24h</div>
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
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.18 0.03 264)",
                    border: "1px solid oklch(1 0 0 / 0.1)",
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                />
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
          <div className="text-sm font-semibold">Success rate</div>
          <div className="text-xs text-muted-foreground">% successful executions</div>
          <div className="h-48 mt-3">
            <ResponsiveContainer>
              <BarChart data={dashboardSeries.slice(-12)}>
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
                  domain={[80, 100]}
                />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.18 0.03 264)",
                    border: "1px solid oklch(1 0 0 / 0.1)",
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="success" fill="oklch(0.78 0.17 165)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel>
          <div className="text-sm font-semibold">Agent health</div>
          <div className="text-xs text-muted-foreground">Top 6 by recent activity</div>
          <div className="mt-3 space-y-2.5">
            {agents.slice(0, 6).map((a) => {
              const matching = DEMO_NODES.find((n) => n.agent === a.name);
              const liveStatus = matching ? demo.statuses[matching.id] : undefined;
              const status =
                liveStatus && liveStatus !== "idle"
                  ? liveStatus === "running"
                    ? "running"
                    : "success"
                  : a.status;
              return (
                <div key={a.id} className="flex items-center gap-3">
                  <StatusDot status={status} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{a.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{a.lastTask}</div>
                  </div>
                  <div className="text-xs font-semibold tabular-nums">{a.health}</div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      {/* Recent executions */}
      <div ref={executionsRef} className="scroll-mt-20">
        <Panel>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <div className="text-sm font-semibold">Recent executions</div>
              <div className="text-xs text-muted-foreground">
                Select the demo run to inspect prompts, tool calls, retries, and final output.
              </div>
            </div>
            <StatBadge tone="info">Live tail</StatBadge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                <tr className="text-left">
                  <th className="font-normal py-2">ID</th>
                  <th className="font-normal">Workflow</th>
                  <th className="font-normal">Status</th>
                  <th className="font-normal">Duration</th>
                  <th className="font-normal text-right">Tokens</th>
                  <th className="font-normal text-right">Cost</th>
                  <th className="font-normal text-right">Started</th>
                  <th className="font-normal text-right pl-3"></th>
                </tr>
              </thead>
              <tbody>
                {demo.isRunning && (
                  <tr className="border-t border-border/60 bg-[var(--electric)]/5">
                    <td className="py-2.5 font-mono text-xs text-[var(--electric)]">exec_8a22</td>
                    <td className="font-medium">Demo Run · all agents</td>
                    <td>
                      <span className="inline-flex items-center gap-1.5">
                        <StatusDot status="running" />
                        <span className="capitalize text-xs">running</span>
                      </span>
                    </td>
                    <td className="text-xs tabular-nums">live</td>
                    <td className="text-right tabular-nums text-xs">
                      {currentRun.costSummary.totalTokens.toLocaleString()}
                    </td>
                    <td className="text-right tabular-nums text-xs">
                      ${currentRun.costSummary.totalCost.toFixed(2)}
                    </td>
                    <td className="text-right text-xs text-muted-foreground">just now</td>
                    <td className="text-right pl-3">
                      <Link
                        to="/debugger"
                        className="text-[11px] font-medium text-[var(--electric)] hover:text-[var(--cyan)] whitespace-nowrap"
                      >
                        View in Debugger →
                      </Link>
                    </td>
                  </tr>
                )}
                {demo.completedExecutions.map((e) => {
                  const highlight = highlightId === e.id;
                  return (
                    <tr
                      key={e.id}
                      className={`border-t border-border/60 hover:bg-white/[0.03] ${highlight ? "animate-row-highlight" : ""}`}
                    >
                      <td className="py-2.5 font-mono text-xs text-[var(--amber)]">{e.id}</td>
                      <td className="font-medium">{e.workflow}</td>
                      <td>
                        <span className="inline-flex items-center gap-1.5">
                          <StatusDot status={e.status} />
                          <span className="capitalize text-xs">{e.status}</span>
                        </span>
                      </td>
                      <td className="text-xs tabular-nums">{e.duration}</td>
                      <td className="text-right tabular-nums text-xs">
                        {e.tokens.toLocaleString()}
                      </td>
                      <td className="text-right tabular-nums text-xs">${e.cost.toFixed(2)}</td>
                      <td className="text-right text-xs text-muted-foreground">{e.started}</td>
                      <td className="text-right pl-3">
                        <Link
                          to="/debugger"
                          className="text-[11px] font-medium text-[var(--electric)] hover:text-[var(--cyan)] whitespace-nowrap"
                        >
                          View in Debugger →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {recentExecutions.map((e) => (
                  <tr key={e.id} className="border-t border-border/60 hover:bg-white/[0.03]">
                    <td className="py-2.5 font-mono text-xs text-muted-foreground">{e.id}</td>
                    <td className="font-medium">{e.workflow}</td>
                    <td>
                      <span className="inline-flex items-center gap-1.5">
                        <StatusDot status={e.status} />
                        <span className="capitalize text-xs">{e.status}</span>
                      </span>
                    </td>
                    <td className="text-xs tabular-nums">{e.duration}</td>
                    <td className="text-right tabular-nums text-xs">{e.tokens.toLocaleString()}</td>
                    <td className="text-right tabular-nums text-xs">${e.cost.toFixed(2)}</td>
                    <td className="text-right text-xs text-muted-foreground">{e.started}</td>
                    <td />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}
