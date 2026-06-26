import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, Panel, StatBadge, StatusBadge, StatusDot } from "@/components/ui/page";
import { agents, type Agent } from "@/lib/mock-data";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Brain, Cpu, DollarSign, Gauge, ShieldCheck, Wrench } from "lucide-react";
import { HealthRing } from "@/components/HealthRing";
import { CopyButton } from "@/components/CopyButton";
import { AGENT_PHASES, getAgentScores } from "@/lib/demo/intelligence";
import { useDemo } from "@/lib/demo-context";

export const Route = createFileRoute("/agents")({
  head: () => ({
    meta: [
      { title: "Agents — GPT Omni Agents" },
      {
        name: "description",
        content: "Specialized sub-agents with skills, tools, models, costs and health.",
      },
    ],
  }),
  component: AgentsPage,
});

function AgentsPage() {
  const [open, setOpen] = useState<Agent | null>(null);
  const demo = useDemo();
  const agentStep = open
    ? demo.currentRun.stepRuns.find((step) => step.agent === open.name)
    : undefined;
  const agentScores = agentStep ? getAgentScores(agentStep) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agents"
        description="Specialized sub-agents, each with its own tools, prompt, model and memory."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {agents.map((a) => (
          <button
            key={a.id}
            onClick={() => setOpen(a)}
            className="text-left rounded-2xl glass p-5 hover:bg-white/[0.06] transition-all hover:-translate-y-0.5 group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <StatusDot status={a.status} />
                  <div className="font-semibold tracking-tight truncate">{a.name}</div>
                </div>
                <div className="mt-1 text-xs text-muted-foreground line-clamp-2">{a.role}</div>
              </div>
              <HealthRing value={a.health} />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
              <Metric icon={Cpu} label="Model" value={a.model} />
              <Metric icon={Gauge} label="Ctx" value={a.contextWindow} />
              <Metric icon={Activity} label="Latency" value={`${a.latencyMs}ms`} />
              <Metric icon={Brain} label="Tokens" value={`${(a.tokens / 1000).toFixed(1)}K`} />
              <Metric icon={DollarSign} label="Cost" value={`$${a.cost.toFixed(2)}`} />
              <Metric icon={Wrench} label="Tools" value={`${a.tools.length}`} />
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {a.skills.slice(0, 3).map((s) => (
                <span
                  key={s}
                  className="text-[10px] px-2 py-0.5 rounded-md border border-border/60 bg-white/[0.03] text-muted-foreground"
                >
                  {s}
                </span>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-border/60">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                <span>Health</span>
                <span className="tabular-nums font-semibold text-foreground">{a.health}%</span>
              </div>
              <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                <div
                  className={`h-full rounded-full ${a.health >= 95 ? "bg-[var(--emerald)]" : a.health >= 85 ? "bg-[var(--cyan)]" : a.health >= 70 ? "bg-[var(--amber)]" : "bg-[var(--destructive)]"}`}
                  style={{ width: `${a.health}%` }}
                />
              </div>
              <div className="mt-2 text-[11px] text-muted-foreground truncate">
                Last: {a.lastTask}
              </div>
            </div>
          </button>
        ))}
      </div>

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="w-full overflow-y-auto border-border/60 bg-popover/95 backdrop-blur-xl sm:max-w-2xl">
          {open && (
            <>
              <SheetHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <SheetTitle className="flex items-center gap-2 text-base">
                      <StatusDot status={open.status} />
                      {open.name}
                      <StatBadge tone="info">{open.model}</StatBadge>
                    </SheetTitle>
                    <SheetDescription className="mt-1">{open.role}</SheetDescription>
                  </div>
                  <HealthRing value={open.health} size={56} stroke={5} label={`${open.health}%`} />
                </div>
              </SheetHeader>

              <Tabs defaultValue="overview" className="mt-2">
                <TabsList className="bg-white/5 border border-border/60">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="prompt">System Prompt</TabsTrigger>
                  <TabsTrigger value="tools">Tools</TabsTrigger>
                  <TabsTrigger value="memory">Memory</TabsTrigger>
                  <TabsTrigger value="logs">Logs</TabsTrigger>
                  <TabsTrigger value="metrics">Metrics</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <Metric icon={Cpu} label="Model" value={open.model} />
                    <Metric icon={Gauge} label="Context" value={open.contextWindow} />
                    <Metric icon={Activity} label="Latency" value={`${open.latencyMs}ms`} />
                    <Metric icon={DollarSign} label="Cost" value={`$${open.cost.toFixed(2)}`} />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <Metric
                      icon={ShieldCheck}
                      label="Confidence"
                      value={`${agentScores?.confidence ?? open.health}%`}
                    />
                    <Metric icon={ShieldCheck} label="Risk" value={agentScores?.risk ?? "Low"} />
                    <Metric
                      icon={ShieldCheck}
                      label="Quality"
                      value={`${agentScores?.quality ?? Math.max(90, open.health - 2)}%`}
                    />
                    <Metric
                      icon={ShieldCheck}
                      label="Reliability"
                      value={`${agentScores?.toolReliability ?? Math.max(88, open.health - 1)}%`}
                    />
                  </div>
                  <Section label="Current status">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={agentStep?.status ?? open.status} />
                      <span className="text-xs text-muted-foreground">
                        {agentStep?.outputSummary ?? "Ready for assignment."}
                      </span>
                    </div>
                  </Section>
                  <Section label="Skills">
                    <div className="flex flex-wrap gap-1.5">
                      {open.skills.map((t) => (
                        <span
                          key={t}
                          className="text-[11px] px-2 py-0.5 rounded-md border border-border/60 bg-white/[0.04]"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </Section>
                  <Section label="Last task">
                    <p className="text-sm">{open.lastTask}</p>
                  </Section>
                  <Section label="Recent tasks">
                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      {[open.lastTask, agentStep?.description, agentStep?.outputSummary]
                        .filter(Boolean)
                        .map((task) => (
                          <div key={task} className="rounded-md bg-white/[0.03] px-2 py-1.5">
                            {task}
                          </div>
                        ))}
                    </div>
                  </Section>
                </TabsContent>

                <TabsContent value="prompt" className="mt-4">
                  <div className="flex items-center justify-end mb-2">
                    <CopyButton text={open.systemPrompt} />
                  </div>
                  <pre className="rounded-lg bg-black/50 border border-border/60 p-3 text-xs font-mono text-muted-foreground whitespace-pre-wrap max-h-[360px] overflow-auto">
                    {open.systemPrompt}
                  </pre>
                </TabsContent>

                <TabsContent value="tools" className="mt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {open.tools.map((t) => (
                      <div
                        key={t}
                        className="rounded-lg bg-white/[0.03] border border-border/60 p-2.5 flex items-center gap-2"
                      >
                        <Wrench className="h-3.5 w-3.5 text-[var(--cyan)]" />
                        <span className="text-xs font-mono">{t}</span>
                        <StatBadge tone="success">enabled</StatBadge>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="memory" className="mt-4 space-y-3">
                  <Section label="Summary">
                    <p className="text-sm text-muted-foreground">{open.memorySummary}</p>
                  </Section>
                  <Section label="Memory access">
                    <div className="flex flex-wrap gap-1.5">
                      {(
                        agentStep?.memoryContext ?? [
                          "agent_profile",
                          "recent_tasks",
                          "policy_scope",
                        ]
                      ).map((memory) => (
                        <span
                          key={memory}
                          className="rounded-md border border-border/60 bg-white/[0.04] px-2 py-0.5 text-[11px] font-mono"
                        >
                          {memory}
                        </span>
                      ))}
                    </div>
                  </Section>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <Metric icon={Brain} label="Vectors" value="2,184" />
                    <Metric icon={Brain} label="Episodes" value="148" />
                    <Metric icon={Brain} label="TTL" value="30d" />
                  </div>
                </TabsContent>

                <TabsContent value="logs" className="mt-4">
                  <pre className="rounded-lg bg-black/50 border border-border/60 p-3 text-[11px] font-mono text-muted-foreground whitespace-pre-wrap max-h-[320px] overflow-auto">
                    {`${AGENT_PHASES.map((phase, index) => `[12:04:${20 + index}] ${phase}`).join("\n")}
[12:04:21] tool:web_search ok in 420ms
[12:04:22] llm:call ${open.model} tokens=1248
[12:04:23] route:next → reviewer
[12:04:24] memory:write key=last_plan
[12:04:25] done in 1.82s · $${open.cost.toFixed(2)}`}
                  </pre>
                </TabsContent>

                <TabsContent value="metrics" className="mt-4 space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <Metric icon={Activity} label="Latency p50" value={`${open.latencyMs}ms`} />
                    <Metric
                      icon={Activity}
                      label="Latency p95"
                      value={`${Math.round(open.latencyMs * 1.6)}ms`}
                    />
                    <Metric icon={Brain} label="Tokens" value={open.tokens.toLocaleString()} />
                    <Metric
                      icon={DollarSign}
                      label="Cost (24h)"
                      value={`$${open.cost.toFixed(2)}`}
                    />
                    <Metric icon={Activity} label="Success rate" value={`${open.health}%`} />
                    <Metric
                      icon={Activity}
                      label="Retry count"
                      value={agentStep?.status === "retried" ? "1" : "0"}
                    />
                    <Metric
                      icon={Cpu}
                      label="Allowed models"
                      value={[open.model, "gpt-4o-mini"].join(", ")}
                    />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-1.5">
                      Health
                    </div>
                    <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className={`h-full ${open.health >= 95 ? "bg-[var(--emerald)]" : open.health >= 85 ? "bg-[var(--cyan)]" : "bg-[var(--amber)]"}`}
                        style={{ width: `${open.health}%` }}
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-white/[0.03] border border-border/60 px-2.5 py-1.5">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="text-xs font-semibold tabular-nums truncate">{value}</div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-1.5">
        {label}
      </div>
      {children}
    </div>
  );
}
