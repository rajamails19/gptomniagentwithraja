import {
  Bell,
  Search,
  Play,
  ChevronDown,
  Presentation,
  RotateCcw,
  GitBranch,
  CheckCircle2,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useDemo } from "@/lib/demo-context";
import { openPresentation } from "@/lib/presentation-store";

const envs = ["Dev", "Stage", "Prod"] as const;

export function Topbar() {
  const [env, setEnv] = useState<(typeof envs)[number]>("Dev");
  const [open, setOpen] = useState(false);
  const demo = useDemo();
  const lastToastEvent = useRef<string | null>(null);

  useEffect(() => {
    const latest = demo.currentRun.traceEvents.at(-1);
    if (!latest || latest.id === lastToastEvent.current) return;
    lastToastEvent.current = latest.id;

    if (latest.type === "status" && latest.agent === "Planner Agent") {
      toast("Planner Finished", {
        description: latest.message,
        icon: <GitBranch className="h-4 w-4 text-[var(--electric)]" />,
      });
    }
    if (latest.agent === "Code Agent" && latest.tone === "success") {
      toast("Developer Agent Completed", {
        description: latest.message,
        icon: <CheckCircle2 className="h-4 w-4 text-[var(--emerald)]" />,
      });
    }
    if (latest.agent === "QA/Test Agent" && latest.tone === "success") {
      toast("QA Approved", {
        description: latest.message,
        icon: <ShieldCheck className="h-4 w-4 text-[var(--emerald)]" />,
      });
    }
    if (latest.type === "artifact") {
      toast("Artifact Generated", {
        description: latest.message,
        icon: <FileText className="h-4 w-4 text-[var(--cyan)]" />,
      });
    }
  }, [demo.currentRun.traceEvents]);

  return (
    <header className="h-16 shrink-0 border-b border-border/60 bg-background/40 backdrop-blur-xl sticky top-0 z-30">
      <div className="h-full px-3 lg:px-6 flex items-center gap-2 lg:gap-3">
        <div className="md:hidden text-sm font-semibold tracking-tight">GPT Omni Agents</div>

        <div className="relative flex-1 max-w-xl ml-2 hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            placeholder="Search agents, workflows, prompts, tools…"
            aria-label="Search agents, workflows, prompts, and tools"
            className="w-full h-9 pl-9 pr-4 rounded-lg bg-white/5 border border-border/60 text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/40 focus:bg-white/[0.07] transition"
          />
        </div>

        <div className="flex-1 md:hidden" />

        <select
          value={demo.selectedScenarioId}
          onChange={(event) => demo.selectScenario(event.target.value)}
          aria-label="Choose demo scenario"
          className="hidden xl:block h-9 max-w-[260px] rounded-lg border border-border/60 bg-white/5 px-3 text-xs text-foreground transition hover:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/55"
        >
          {demo.scenarios.map((scenario) => (
            <option key={scenario.id} value={scenario.id} className="bg-popover">
              {scenario.title}
            </option>
          ))}
        </select>

        <button
          onClick={() => {
            openPresentation();
            toast("Presentation Started", {
              description: "Guided investor/client walkthrough opened.",
              icon: <Presentation className="h-4 w-4 text-[var(--cyan)]" />,
            });
          }}
          className="hidden md:inline-flex h-9 px-3 items-center gap-1.5 rounded-lg glass text-xs font-medium transition-[background,transform] duration-200 hover:-translate-y-px hover:bg-white/[0.08] active:translate-y-0 focus-visible:ring-2 focus-visible:ring-[var(--ring)]/55"
          title="Presentation Mode"
          aria-label="Open presentation mode"
        >
          <Presentation className="h-3.5 w-3.5" /> Presentation
        </button>

        <div className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-2 h-9 px-3 rounded-lg glass text-xs font-medium transition-[background,transform] duration-200 hover:-translate-y-px hover:bg-white/[0.08] active:translate-y-0 focus-visible:ring-2 focus-visible:ring-[var(--ring)]/55"
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label="Select environment"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--emerald)]" />
            <span>{env}</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-60" />
          </button>
          {open && (
            <div className="absolute right-0 mt-2 w-32 rounded-lg glass-strong p-1 z-50">
              {envs.map((e) => (
                <button
                  key={e}
                  onClick={() => {
                    setEnv(e);
                    setOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 rounded-md text-xs hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-[var(--ring)]/55"
                >
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>

        {demo.isRunning ? (
          <Button
            onClick={() => {
              demo.reset();
              toast("Workflow Cancelled", {
                description: "The active demo run was reset.",
                icon: <RotateCcw className="h-4 w-4 text-[var(--amber)]" />,
              });
            }}
            className="h-9 bg-white/5 hover:bg-white/10 text-foreground border border-border/60"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Stop
          </Button>
        ) : (
          <Button
            onClick={() => {
              demo.start();
              toast("Workflow Started", {
                description: "Planner → Research → Code → Docs → QA → Reviewer",
                icon: <Play className="h-4 w-4 text-[var(--electric)]" />,
              });
            }}
            className="h-9 bg-gradient-to-r from-[var(--electric)] to-[var(--violet)] hover:opacity-95 text-white border-0 shadow-[0_8px_24px_-12px_oklch(0.7_0.2_265/0.7)]"
          >
            <Play className="h-3.5 w-3.5 mr-1.5" /> Run Demo
          </Button>
        )}

        <button
          className="relative h-9 w-9 hidden sm:grid place-items-center rounded-lg transition hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-[var(--ring)]/55"
          aria-label="View notifications"
        >
          <Bell className="h-4 w-4 text-muted-foreground" />
          <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-[var(--amber)]" />
        </button>

        <div className="h-9 pl-1 pr-3 hidden sm:flex items-center gap-2 rounded-lg glass">
          <div className="h-7 w-7 rounded-md bg-gradient-to-br from-[var(--violet)] to-[var(--electric)] grid place-items-center text-[11px] font-semibold text-white">
            AK
          </div>
          <div className="hidden md:block leading-tight">
            <div className="text-xs font-medium">Alex Kim</div>
            <div className="text-[10px] text-muted-foreground">Platform Lead</div>
          </div>
        </div>
      </div>
    </header>
  );
}
