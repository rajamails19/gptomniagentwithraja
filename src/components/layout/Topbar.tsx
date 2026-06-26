import { Bell, Search, Play, ChevronDown, Presentation, RotateCcw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useDemo } from "@/lib/demo-context";
import { openPresentation } from "@/lib/presentation-store";

const envs = ["Dev", "Stage", "Prod"] as const;

export function Topbar() {
  const [env, setEnv] = useState<(typeof envs)[number]>("Dev");
  const [open, setOpen] = useState(false);
  const demo = useDemo();

  return (
    <header className="h-16 shrink-0 border-b border-border/60 bg-background/40 backdrop-blur-xl sticky top-0 z-30">
      <div className="h-full px-3 lg:px-6 flex items-center gap-2 lg:gap-3">
        <div className="md:hidden text-sm font-semibold tracking-tight">GPT Omni Agents</div>

        <div className="relative flex-1 max-w-xl ml-2 hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            placeholder="Search agents, workflows, prompts, tools…"
            className="w-full h-9 pl-9 pr-4 rounded-lg bg-white/5 border border-border/60 text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/40 focus:bg-white/[0.07] transition"
          />
        </div>

        <div className="flex-1 md:hidden" />

        <button
          onClick={() => openPresentation()}
          className="hidden md:inline-flex h-9 px-3 items-center gap-1.5 rounded-lg glass text-xs font-medium hover:bg-white/[0.08] transition"
          title="Presentation Mode"
        >
          <Presentation className="h-3.5 w-3.5" /> Presentation
        </button>

        <div className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-2 h-9 px-3 rounded-lg glass text-xs font-medium hover:bg-white/[0.08] transition"
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
                  className="w-full text-left px-3 py-1.5 rounded-md text-xs hover:bg-white/10"
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
              toast("Demo reset");
            }}
            className="h-9 bg-white/5 hover:bg-white/10 text-foreground border border-border/60"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Stop
          </Button>
        ) : (
          <Button
            onClick={() => {
              demo.start();
              toast.success("Demo workflow started", {
                description: "Planner → Research → Code → Docs → QA → Reviewer",
              });
            }}
            className="h-9 bg-gradient-to-r from-[var(--electric)] to-[var(--violet)] hover:opacity-95 text-white border-0 shadow-[0_8px_24px_-12px_oklch(0.7_0.2_265/0.7)]"
          >
            <Play className="h-3.5 w-3.5 mr-1.5" /> Run Demo
          </Button>
        )}

        <button className="relative h-9 w-9 hidden sm:grid place-items-center rounded-lg hover:bg-white/5 transition">
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
