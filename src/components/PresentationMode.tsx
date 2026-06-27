import { useEffect, useState } from "react";
import {
  Activity,
  Brain,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Database,
  FileText,
  GitBranch,
  LayoutDashboard,
  MemoryStick,
  MonitorDot,
  Play,
  RotateCcw,
  Settings,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  Wrench,
  X,
} from "lucide-react";
import { closePresentation, usePresentation } from "@/lib/presentation-store";
import { useDemo } from "@/lib/demo-context";
import { StatBadge, StatusDot } from "@/components/ui/page";

const slides = [
  { id: "problem", title: "The Problem", icon: Sparkles },
  { id: "overview", title: "Platform Overview", icon: LayoutDashboard },
  { id: "workflow", title: "Live Workflow", icon: Activity },
  { id: "observability", title: "Observability", icon: Brain },
  { id: "governance", title: "Governance", icon: ShieldCheck },
  { id: "value", title: "Business Value", icon: CircleDollarSign },
  { id: "architecture", title: "Architecture", icon: GitBranch },
  { id: "thanks", title: "Thank You", icon: Sparkles },
] as const;

const platformModules = [
  { name: "Planner", icon: GitBranch, text: "Breaks a business request into ordered agent tasks." },
  {
    name: "Agents",
    icon: Brain,
    text: "Specialists execute research, code, docs, QA, and review.",
  },
  { name: "Workflow", icon: Activity, text: "Shows live execution status across every step." },
  {
    name: "Debugger",
    icon: TerminalSquare,
    text: "Proves prompts, models, tools, retries, and outputs.",
  },
  { name: "Monitoring", icon: MonitorDot, text: "Tracks latency, success rate, and run health." },
  {
    name: "Memory",
    icon: MemoryStick,
    text: "Scopes reusable context to the right agent and run.",
  },
  { name: "Prompts", icon: FileText, text: "Controls prompt versions, ownership, and reuse." },
  { name: "Tools", icon: Wrench, text: "Manages approved capabilities each agent can call." },
  {
    name: "Cost",
    icon: CircleDollarSign,
    text: "Surfaces spend, tokens, and optimization signals.",
  },
  { name: "Settings", icon: Settings, text: "Centralizes environment, policy, and demo controls." },
];

const governanceItems = [
  "Prompt versioning",
  "Memory isolation",
  "Tool permissions",
  "Execution history",
  "Audit trail",
  "Cost tracking",
  "Environment awareness",
];

const observabilityItems = [
  "Prompt",
  "Model",
  "Memory",
  "Tool calls",
  "Latency",
  "Retry",
  "Cost",
  "Final output",
];

const architectureFlow = [
  { label: "User", detail: "Submits a goal" },
  { label: "Planner", detail: "Creates the execution plan" },
  { label: "Specialized Agents", detail: "Research, code, docs, QA, and review" },
  { label: "Tools + Memory", detail: "Approved capabilities and scoped context" },
  { label: "Reviewer", detail: "Applies quality and governance checks" },
  { label: "Final Output", detail: "Publishes the approved artifact" },
  { label: "Monitoring + Audit", detail: "Captures trace, cost, and history" },
];

export function PresentationMode() {
  const { open } = usePresentation();
  const [i, setI] = useState(0);
  const demo = useDemo();

  const goNext = () => setI((v) => Math.min(slides.length - 1, v + 1));
  const goPrev = () => setI((v) => Math.max(0, v - 1));
  const restart = () => setI(0);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePresentation();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open && slides[i].id === "workflow" && !demo.isRunning && !demo.isComplete) {
      demo.start();
    }
  }, [open, i, demo]);

  if (!open) return null;
  const slide = slides[i];

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-2xl flex flex-col animate-fade-in">
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
      <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-[oklch(0.7_0.22_270/0.25)] blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-[oklch(0.7_0.18_210/0.2)] blur-3xl pointer-events-none" />

      <header className="relative min-h-16 shrink-0 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-border/60">
        <div className="flex items-center gap-3 min-w-0">
          <StatBadge tone="info">Presentation Mode</StatBadge>
          <div className="text-sm text-muted-foreground hidden md:block truncate">
            {demo.selectedScenario.title} - guided investor walkthrough
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1">
            {slides.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => setI(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === i ? "w-8 bg-[var(--electric)]" : "w-4 bg-white/15 hover:bg-white/30"
                }`}
                aria-label={`Go to ${s.title}`}
              />
            ))}
          </div>
          <button
            onClick={restart}
            className="h-9 px-3 inline-flex items-center gap-1.5 rounded-lg hover:bg-white/10 text-xs"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restart
          </button>
          <button
            onClick={closePresentation}
            className="h-9 w-9 grid place-items-center rounded-lg hover:bg-white/10"
            aria-label="Exit presentation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="relative flex-1 overflow-auto px-4 sm:px-6 lg:px-16 py-8 lg:py-10">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl glass grid place-items-center">
              <slide.icon className="h-5 w-5 text-[var(--electric)]" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Slide {i + 1} / {slides.length}
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight">
                <span className="text-gradient">{slide.title}</span>
              </h2>
            </div>
          </div>

          <div key={slide.id} className="mt-8 transition-opacity duration-300 animate-fade-in">
            {slide.id === "problem" && <ProblemSlide />}
            {slide.id === "overview" && <OverviewSlide />}
            {slide.id === "workflow" && <WorkflowSlide />}
            {slide.id === "observability" && <ObservabilitySlide />}
            {slide.id === "governance" && <GovernanceSlide />}
            {slide.id === "value" && <ValueSlide />}
            {slide.id === "architecture" && <ArchitectureSlide />}
            {slide.id === "thanks" && <ThanksSlide />}
          </div>
        </div>
      </div>

      <footer className="relative min-h-16 shrink-0 px-4 sm:px-6 py-3 flex items-center justify-between gap-3 border-t border-border/60">
        <button
          onClick={goPrev}
          disabled={i === 0}
          className="h-9 px-3 inline-flex items-center gap-1.5 rounded-lg glass text-sm disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" /> Previous
        </button>
        <div className="text-xs text-muted-foreground text-center">
          {i + 1} of {slides.length}
          <span className="hidden md:inline"> - use arrow keys, ESC exits</span>
        </div>
        <button
          onClick={goNext}
          disabled={i === slides.length - 1}
          className="h-9 px-4 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[var(--electric)] to-[var(--violet)] text-white text-sm disabled:opacity-40"
        >
          Next <ChevronRight className="h-4 w-4" />
        </button>
      </footer>
    </div>
  );
}

function ProblemSlide() {
  const demo = useDemo();
  const scenario = demo.selectedScenario;
  const problems = [
    "Teams use many disconnected AI tools.",
    "Leaders have limited visibility into execution.",
    "Decisions are difficult to audit after the fact.",
    "AI spend is hard to control across teams.",
    "Governance is fragmented across prompts, tools, and memory.",
  ];

  return (
    <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-4 lg:gap-6">
      <div className="rounded-2xl glass p-6 lg:p-8">
        <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
          Enterprise AI today
        </div>
        <h3 className="mt-3 text-2xl lg:text-3xl font-semibold">
          {scenario.title} needs speed, traceability, and control.
        </h3>
        <p className="mt-4 text-sm lg:text-base text-muted-foreground leading-relaxed">
          {scenario.businessObjective} The challenge is coordinating specialist AI work while
          keeping every decision observable, auditable, and cost-aware.
        </p>
      </div>
      <div className="rounded-2xl glass p-6">
        <div className="space-y-3">
          {problems.map((problem) => (
            <div key={problem} className="flex items-start gap-3 rounded-xl bg-white/[0.04] p-3">
              <StatusDot status="queued" />
              <span className="text-sm text-muted-foreground">{problem}</span>
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-xl border border-[var(--electric)]/30 bg-[var(--electric)]/10 p-4">
          <div className="text-base font-semibold">
            OmniAgents provides one unified AI Control Room.
          </div>
        </div>
      </div>
    </div>
  );
}

function OverviewSlide() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl glass p-5">
        <div className="text-lg font-semibold">A single operating layer for agentic work</div>
        <p className="mt-2 text-sm text-muted-foreground max-w-3xl">
          The platform turns scattered AI activity into a guided control room where planning,
          execution, debugging, monitoring, memory, prompts, tools, cost, and policy live together.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {platformModules.map((module) => (
          <div key={module.name} className="rounded-2xl glass p-4">
            <div className="flex items-center gap-2">
              <module.icon className="h-4 w-4 text-[var(--electric)]" />
              <div className="text-sm font-semibold">{module.name}</div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{module.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkflowSlide() {
  const demo = useDemo();
  const currentRun = demo.currentRun;
  const narrative = currentRun.stepRuns.map((step) => step.description);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl glass p-5">
        <div>
          <div className="text-sm font-semibold">Goal: {currentRun.goal}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {demo.selectedScenario.presentationFocus}. The same selected scenario powers Dashboard,
            Workflow, Debugger, Monitoring, Cost, and this presentation.
          </div>
        </div>
        <button
          onClick={() => demo.start()}
          className="h-9 px-4 rounded-lg bg-gradient-to-r from-[var(--electric)] to-[var(--violet)] text-white text-sm inline-flex items-center justify-center gap-1.5"
        >
          <Play className="h-3.5 w-3.5" />
          Replay Workflow
        </button>
      </div>

      <div className="grid lg:grid-cols-[0.85fr_1.15fr] gap-4">
        <div className="rounded-2xl glass p-5">
          <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground mb-3">
            Demo story
          </div>
          <div className="space-y-2">
            {narrative.map((item, idx) => (
              <div key={item} className="flex items-center gap-3 rounded-xl bg-white/[0.04] p-3">
                <div className="h-6 w-6 rounded-full bg-white/10 grid place-items-center text-[11px] font-mono">
                  {idx + 1}
                </div>
                <div className="text-sm text-muted-foreground">{item}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl glass p-5">
          <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground mb-3">
            Live workflow state
          </div>
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-2">
            {currentRun.stepRuns.map((step) => {
              const active = step.status === "running";
              const done = step.status === "completed" || step.status === "retried";
              return (
                <div
                  key={step.id}
                  className={`rounded-xl border p-3 transition ${
                    active
                      ? "border-[var(--electric)]/60 bg-[var(--electric)]/10 shadow-[0_0_28px_-18px_oklch(0.72_0.2_250/0.9)]"
                      : done
                        ? "border-[var(--emerald)]/30 bg-[oklch(0.78_0.17_165/0.08)]"
                        : "border-border/60 bg-white/[0.03]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <StatusDot
                      status={
                        active
                          ? "running"
                          : done
                            ? "success"
                            : step.status === "pending"
                              ? "queued"
                              : "error"
                      }
                    />
                    <span className="text-xs font-semibold truncate">{step.label}</span>
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground truncate">
                    {step.agent}
                  </div>
                  <div className="mt-2 text-[10px] text-muted-foreground tabular-nums">
                    {step.latencyMs}ms - ${step.cost.toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function ObservabilitySlide() {
  const demo = useDemo();
  const docsStep = demo.currentRun.stepRuns.find((step) => step.id === "docs");
  const traceEvents = demo.currentRun.traceEvents.filter((event) => event.stepId === "docs");

  return (
    <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-4">
      <div className="rounded-2xl glass p-6">
        <div className="text-lg font-semibold">Every AI action is observable.</div>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          The Debugger exists so technical buyers can inspect exactly what happened: the prompt, the
          model, the context, the tool call, the retry, the cost, and the final approved output.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          {observabilityItems.map((item) => (
            <div key={item} className="rounded-xl bg-white/[0.04] border border-border/60 p-3">
              <div className="text-sm font-medium">{item}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl glass p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Selected trace: {docsStep?.agent}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Shows scenario-specific prompt, memory, tool, retry, cost, and final artifact
              evidence.
            </div>
          </div>
          <StatBadge tone="success">auditable</StatBadge>
        </div>
        <pre className="mt-4 rounded-lg bg-black/50 border border-border/60 p-4 text-xs font-mono text-muted-foreground whitespace-pre-wrap overflow-x-auto">{`agent: ${docsStep?.agent ?? "Documentation Agent"}
model: ${docsStep?.model ?? "claude-3.5-sonnet"}
prompt: ${docsStep?.promptSummary ?? "Draft markdown API reference"}
memory: ${docsStep?.memoryContext.join(", ") ?? "style_guide_v3.2"}
tool: ${demo.currentRun.toolCalls.find((tool) => tool.stepId === "docs")?.tool ?? "artifact_compose"}
retry: ${demo.selectedScenario.stepMessages.docs.some((event) => event.type === "retry") ? "Recovered with deterministic backoff" : "No retry required"}
latency: ${docsStep?.latencyMs ?? 5030}ms
cost: $${docsStep?.cost.toFixed(2) ?? "0.63"}
output: ${docsStep?.outputSummary ?? "Approved markdown artifact"}`}</pre>
        <div className="mt-4 space-y-2">
          {traceEvents.length > 0 ? (
            traceEvents.slice(-3).map((event) => (
              <div key={event.id} className="rounded-lg bg-white/[0.04] px-3 py-2 text-xs">
                <span className="text-[var(--electric)]">{event.type}</span>
                <span className="text-muted-foreground"> - {event.message}</span>
              </div>
            ))
          ) : (
            <div className="rounded-lg bg-white/[0.04] px-3 py-2 text-xs text-muted-foreground">
              Run the workflow slide to populate live trace events.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GovernanceSlide() {
  return (
    <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-4">
      <div className="rounded-2xl glass p-6">
        <div className="text-lg font-semibold">Control without slowing the demo down</div>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Governance is presented as part of the operating model: what agents can use, which context
          they can see, how prompts evolve, and how every decision becomes reviewable.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {governanceItems.map((item) => (
          <div key={item} className="rounded-2xl glass p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[var(--emerald)]" />
              <div className="text-sm font-semibold">{item}</div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Included in the control-room story as a visible demo capability.
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ValueSlide() {
  const demo = useDemo();
  const metrics = [
    ...demo.selectedScenario.successMetrics.map((metric) => ({
      value: metric.value,
      label: metric.label,
    })),
    {
      value: `$${demo.selectedScenario.costSummary.totalCost.toFixed(2)}`,
      label: "estimated run cost",
    },
    {
      value: `${(demo.selectedScenario.costSummary.latencyMs / 1000).toFixed(0)}s`,
      label: "estimated execution time",
    },
    { value: "100%", label: "traceability" },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl glass p-5">
        <div className="flex items-center gap-2">
          <StatBadge tone="info">Demo metrics</StatBadge>
          <div className="text-sm text-muted-foreground">
            Positioned for client and investor storytelling.
          </div>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-2xl glass-strong p-6">
            <div className="text-3xl font-semibold text-gradient">{metric.value}</div>
            <div className="mt-2 text-sm font-medium">{metric.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ArchitectureSlide() {
  const demo = useDemo();
  const scenarioFlow = architectureFlow.map((item, index) =>
    index > 0 && index < 6
      ? {
          ...item,
          detail: demo.currentRun.stepRuns[index]?.description ?? item.detail,
        }
      : item,
  );
  return (
    <div className="rounded-2xl glass p-6">
      <div className="text-lg font-semibold">Simple control-room architecture</div>
      <p className="mt-2 text-sm text-muted-foreground">
        The selected scenario stays understandable: one request becomes a planned, observable,
        governed execution that produces {demo.currentRun.finalArtifact.filename}.
      </p>
      <div className="mt-6 grid gap-3">
        {scenarioFlow.map((item, idx) => (
          <div key={item.label}>
            <div className="rounded-xl border border-border/60 bg-white/[0.04] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-white/10 grid place-items-center text-xs font-mono">
                  {idx + 1}
                </div>
                <div>
                  <div className="text-sm font-semibold">{item.label}</div>
                  <div className="text-xs text-muted-foreground">{item.detail}</div>
                </div>
              </div>
              {idx === 3 && <Database className="h-4 w-4 text-[var(--electric)]" />}
            </div>
            {idx < architectureFlow.length - 1 && (
              <div className="ml-4 h-4 border-l border-border/70" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ThanksSlide() {
  const demo = useDemo();
  return (
    <div className="min-h-[420px] rounded-2xl glass p-8 lg:p-12 flex flex-col items-center justify-center text-center">
      <div className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
        OmniAgents
      </div>
      <h3 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight">
        <span className="text-gradient">Enterprise AI Agent Orchestration Platform</span>
      </h3>
      <p className="mt-5 max-w-2xl text-sm sm:text-base text-muted-foreground leading-relaxed">
        {demo.selectedScenario.title}: {demo.selectedScenario.businessObjective}
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <StatBadge tone="info">Planning</StatBadge>
        <StatBadge tone="success">Observability</StatBadge>
        <StatBadge tone="warn">Governance</StatBadge>
      </div>
    </div>
  );
}
