import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Activity,
  Brain,
  GitBranch,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { closePresentation, usePresentation } from "@/lib/presentation-store";
import { useDemo, DEMO_NODES } from "@/lib/demo-context";
import { StatBadge, StatusDot } from "@/components/ui/page";
import { FINAL_OUTPUT_TITLE } from "@/lib/final-output";

const slides = [
  { id: "problem", title: "The Problem", icon: Sparkles },
  { id: "architecture", title: "Architecture", icon: GitBranch },
  { id: "workflow", title: "Live Workflow", icon: Activity },
  { id: "debug", title: "Debug Trace", icon: Brain },
  { id: "value", title: "Business Value", icon: ShieldCheck },
] as const;

export function PresentationMode() {
  const { open } = usePresentation();
  const [i, setI] = useState(0);
  const demo = useDemo();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePresentation();
      if (e.key === "ArrowRight") setI((v) => Math.min(slides.length - 1, v + 1));
      if (e.key === "ArrowLeft") setI((v) => Math.max(0, v - 1));
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

      <header className="relative h-16 shrink-0 px-6 flex items-center justify-between border-b border-border/60">
        <div className="flex items-center gap-3">
          <StatBadge tone="info">Presentation Mode</StatBadge>
          <div className="text-sm text-muted-foreground hidden md:block">
            GPT Omni Agents · Multi-Agent Workflow Demo
          </div>
        </div>
        <div className="flex items-center gap-2">
          {slides.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setI(idx)}
              className={`h-1.5 rounded-full transition-all ${idx === i ? "w-8 bg-[var(--electric)]" : "w-4 bg-white/15 hover:bg-white/30"}`}
              aria-label={s.title}
            />
          ))}
          <button
            onClick={closePresentation}
            className="ml-3 h-9 w-9 grid place-items-center rounded-lg hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="relative flex-1 overflow-auto px-6 lg:px-16 py-10">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl glass grid place-items-center">
              <slide.icon className="h-5 w-5 text-[var(--electric)]" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Slide {i + 1} / {slides.length}
              </div>
              <h2 className="text-3xl lg:text-4xl font-semibold tracking-tight">
                <span className="text-gradient">{slide.title}</span>
              </h2>
            </div>
          </div>

          <div className="mt-8">
            {slide.id === "problem" && <ProblemSlide />}
            {slide.id === "architecture" && <ArchSlide />}
            {slide.id === "workflow" && <WorkflowSlide />}
            {slide.id === "debug" && <DebugSlide />}
            {slide.id === "value" && <ValueSlide />}
          </div>
        </div>
      </div>

      <footer className="relative h-16 shrink-0 px-6 flex items-center justify-between border-t border-border/60">
        <button
          onClick={() => setI((v) => Math.max(0, v - 1))}
          disabled={i === 0}
          className="h-9 px-3 inline-flex items-center gap-1.5 rounded-lg glass text-sm disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" /> Previous
        </button>
        <div className="text-xs text-muted-foreground hidden md:block">
          Use ← → keys · Esc to exit
        </div>
        <button
          onClick={() => setI((v) => Math.min(slides.length - 1, v + 1))}
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
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="rounded-2xl glass p-6">
        <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Today</div>
        <p className="mt-2 text-lg">
          A single LLM call can't reliably produce production-grade engineering deliverables — docs,
          refactors, audits, deploys.
        </p>
        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          <li>· Hallucinated APIs and silent errors</li>
          <li>· No visibility into cost, latency or retries</li>
          <li>· No safety, review, or QA gate</li>
        </ul>
      </div>
      <div className="rounded-2xl glass p-6">
        <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
          With GPT Omni Agents
        </div>
        <p className="mt-2 text-lg">
          A network of specialized agents plans, executes, reviews, debugs and observes every
          workflow end-to-end.
        </p>
        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          <li>· Planner + Orchestrator + 10 specialized agents</li>
          <li>· Trace-level debugger and live monitoring</li>
          <li>· Cost router cuts spend by ~32%</li>
        </ul>
      </div>
    </div>
  );
}

function ArchSlide() {
  const layers = [
    { t: "Planner", d: "Breaks user goal into typed, dependency-aware tasks." },
    { t: "Orchestrator", d: "Routes tasks to specialized agents and tools." },
    { t: "Sub-Agents", d: "Research · Code · Docs · QA · Reviewer · Security." },
    { t: "Debugger", d: "Step-level traces, retries, errors and replays." },
    { t: "Monitoring", d: "Latency, tokens, success rate, alerts." },
    { t: "Cost Analytics", d: "Per-workflow, per-agent spend with recommendations." },
  ];
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {layers.map((l) => (
        <div key={l.t} className="rounded-2xl glass p-5">
          <div className="text-sm font-semibold">{l.t}</div>
          <p className="mt-1.5 text-xs text-muted-foreground">{l.d}</p>
        </div>
      ))}
    </div>
  );
}

function WorkflowSlide() {
  const demo = useDemo();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Goal · Create API documentation for payments service
        </div>
        <button
          onClick={() => demo.start()}
          className="h-9 px-4 rounded-lg bg-gradient-to-r from-[var(--electric)] to-[var(--violet)] text-white text-sm"
        >
          Replay
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
        {DEMO_NODES.map((n) => {
          const s = demo.statuses[n.id];
          return (
            <div
              key={n.id}
              className={`rounded-xl glass p-3 text-xs ${s === "running" ? "glow-primary" : ""}`}
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
                <span className="truncate font-medium">{n.label}</span>
              </div>
              <div className="mt-1 text-[10px] text-muted-foreground truncate">{n.agent}</div>
            </div>
          );
        })}
      </div>
      <div className="rounded-2xl glass p-4 max-h-72 overflow-auto">
        <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground mb-2">
          Live trace
        </div>
        {demo.logs.length === 0 ? (
          <div className="text-xs text-muted-foreground">Press Replay to start the workflow.</div>
        ) : (
          <div className="space-y-1 font-mono text-[11px]">
            {demo.logs.map((l, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-muted-foreground">[{l.ts}]</span>
                <span className="text-[var(--electric)]">{l.agent}</span>
                <span
                  className={
                    l.tone === "error"
                      ? "text-[var(--destructive)]"
                      : l.tone === "warn"
                        ? "text-[var(--amber)]"
                        : l.tone === "success"
                          ? "text-[var(--emerald)]"
                          : "text-muted-foreground"
                  }
                >
                  {l.message}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DebugSlide() {
  return (
    <div className="rounded-2xl glass p-6">
      <div className="text-sm font-semibold">Documentation Agent · draft v1 → retry</div>
      <div className="text-xs text-muted-foreground">
        attempt 1: ToolTimeoutError schema_to_md exceeded 2500ms
      </div>
      <pre className="mt-4 rounded-lg bg-black/50 border border-border/60 p-4 text-xs font-mono text-muted-foreground whitespace-pre-wrap overflow-x-auto">{`attempt 1: ToolTimeoutError schema_to_md > 2500ms
backoff:    600ms (exponential, jitter ±15%)
attempt 2:  ok in 2410ms
result:     ${FINAL_OUTPUT_TITLE} v1.0 (18.4KB)`}</pre>
      <div className="mt-4 grid sm:grid-cols-3 gap-3 text-xs">
        <Stat k="Total steps" v="7" />
        <Stat k="Retries" v="1" />
        <Stat k="Total cost" v="$0.41" />
      </div>
    </div>
  );
}

function ValueSlide() {
  const cards = [
    {
      t: "10× faster documentation",
      d: "Multi-agent pipeline ships production docs in under 60s. Manual baseline: 4–6 hours.",
    },
    {
      t: "32% lower AI spend",
      d: "Cost-router downgrades safe steps to cheaper models. $1.2K saved last week alone.",
    },
    {
      t: "Safer, audited output",
      d: "Reviewer + QA + Security agents gate every artifact. Zero PII leaks in last 200 traces.",
    },
  ];
  return (
    <div className="grid md:grid-cols-3 gap-4">
      {cards.map((c) => (
        <div key={c.t} className="rounded-2xl glass-strong p-6">
          <div className="text-lg font-semibold text-gradient">{c.t}</div>
          <p className="mt-2 text-sm text-muted-foreground">{c.d}</p>
        </div>
      ))}
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg bg-white/[0.04] border border-border/60 p-3">
      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{k}</div>
      <div className="text-xl font-semibold tabular-nums">{v}</div>
    </div>
  );
}
