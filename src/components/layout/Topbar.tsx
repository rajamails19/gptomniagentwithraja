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
  Route,
  Menu,
  X,
  Sparkles,
  LayoutDashboard,
  Workflow,
  Bot,
  Bug,
  Activity,
  BookText,
  Brain,
  Wrench,
  DollarSign,
  ClipboardCheck,
  Settings,
  Sun,
  Moon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useDemo } from "@/lib/demo-context";
import { openPresentation } from "@/lib/presentation-store";
import { openVisualGuide } from "@/lib/visual-guide-store";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/use-theme";

const envs = ["Dev", "Stage", "Prod"] as const;
const mobileNav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/planner", label: "Planner", icon: Workflow },
  { to: "/agents", label: "Agents", icon: Bot },
  { to: "/workflow", label: "Workflow", icon: GitBranch },
  { to: "/debugger", label: "Debugger", icon: Bug },
  { to: "/monitoring", label: "Monitoring", icon: Activity },
  { to: "/prompts", label: "Prompt Library", icon: BookText },
  { to: "/memory", label: "Memory", icon: Brain },
  { to: "/tools", label: "Tools", icon: Wrench },
  { to: "/cost", label: "Cost Analytics", icon: DollarSign },
  { to: "/evals", label: "Evals", icon: ClipboardCheck },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/about", label: "About Raja", icon: Sparkles },
] as const;

export function Topbar() {
  const [env, setEnv] = useState<(typeof envs)[number]>("Dev");
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const demo = useDemo();
  const { isDark, toggle } = useTheme();
  const lastToastEvent = useRef<string | null>(null);
  const pathname = useRouterState({ select: (state) => state.location.pathname });

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
    <header className="min-h-16 shrink-0 border-b border-border/60 bg-background/70 backdrop-blur-xl sticky top-0 z-50">
      <div className="min-h-16 px-3 lg:px-6 flex items-center gap-2 lg:gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="grid h-9 w-9 place-items-center rounded-lg border border-border/60 bg-white/[0.04] transition hover:bg-white/[0.08] focus-visible:ring-2 focus-visible:ring-[var(--ring)]/55 md:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="min-w-0 md:hidden">
          <div className="truncate text-sm font-semibold tracking-tight">OmniAgents</div>
          <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            NuvRajLabs
          </div>
        </div>

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

        <button
          onClick={() => {
            openVisualGuide();
          }}
          className="hidden lg:inline-flex h-9 px-3 items-center gap-1.5 rounded-lg border border-[var(--amber)]/25 bg-[var(--amber)]/10 text-xs font-semibold text-[var(--amber)] transition-[background,transform,border-color] duration-200 hover:-translate-y-px hover:border-[var(--amber)]/40 hover:bg-[var(--amber)]/15 active:translate-y-0 focus-visible:ring-2 focus-visible:ring-[var(--ring)]/55"
          title="Visual Guide"
          aria-label="Start visual guide"
        >
          <Route className="h-3.5 w-3.5" /> Visual Guide
        </button>

        <div className="relative hidden sm:block">
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
            className="h-9 bg-white/5 hover:bg-white/10 text-foreground border border-border/60 px-3"
          >
            <RotateCcw className="h-3.5 w-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Stop</span>
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
            className="h-9 bg-gradient-to-r from-[var(--electric)] to-[var(--violet)] hover:opacity-95 text-white border-0 shadow-[0_8px_24px_-12px_oklch(0.7_0.2_265/0.7)] px-3"
          >
            <Play className="h-3.5 w-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Run Demo</span>
            <span className="sm:hidden">Run</span>
          </Button>
        )}

        <button
          className="relative h-9 w-9 hidden sm:grid place-items-center rounded-lg transition hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-[var(--ring)]/55"
          aria-label="View notifications"
        >
          <Bell className="h-4 w-4 text-muted-foreground" />
          <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-[var(--amber)]" />
        </button>

        <button
          onClick={toggle}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          className="h-9 w-9 hidden sm:grid place-items-center rounded-lg transition-all duration-200 hover:bg-accent focus-visible:ring-2 focus-visible:ring-[var(--ring)]/55"
          title={isDark ? "Light mode" : "Dark mode"}
        >
          {isDark ? (
            <Sun className="h-4 w-4 text-[var(--amber)]" />
          ) : (
            <Moon className="h-4 w-4 text-[var(--electric)]" />
          )}
        </button>

        <div className="h-9 pl-1 pr-3 hidden sm:flex items-center gap-2 rounded-lg glass">
          <div className="h-7 w-7 rounded-md bg-gradient-to-br from-[var(--violet)] to-[var(--electric)] grid place-items-center text-[11px] font-semibold text-white">
            RA
          </div>
          <div className="hidden md:block leading-tight">
            <div className="text-xs font-medium">Raja</div>
            <div className="text-[10px] text-muted-foreground">Founder · NuvRajLabs</div>
          </div>
        </div>
      </div>
      {mobileOpen && (
        <div className="fixed inset-0 z-[80] md:hidden">
          <button
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation overlay"
          />
          <div className="absolute left-0 top-0 flex h-dvh w-[min(86vw,340px)] flex-col border-r border-border/60 bg-[oklch(0.14_0.03_264/0.98)] shadow-[24px_0_70px_-32px_oklch(0_0_0/0.95)] backdrop-blur-xl">
            <div className="flex h-16 items-center justify-between border-b border-border/60 px-4">
              <div className="flex items-center gap-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[var(--electric)] to-[var(--violet)] glow-primary">
                  <Sparkles className="h-4.5 w-4.5 text-white" />
                </div>
                <div>
                  <div className="text-sm font-semibold">OmniAgents</div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    NuvRajLabs
                  </div>
                </div>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-lg hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-[var(--ring)]/55"
                aria-label="Close navigation menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 border-b border-border/60 p-3">
              <select
                value={demo.selectedScenarioId}
                onChange={(event) => demo.selectScenario(event.target.value)}
                aria-label="Choose demo scenario"
                className="h-10 w-full rounded-lg border border-border/60 bg-white/5 px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/55"
              >
                {demo.scenarios.map((scenario) => (
                  <option key={scenario.id} value={scenario.id} className="bg-popover">
                    {scenario.title}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => {
                    demo.start();
                    setMobileOpen(false);
                  }}
                  className="h-10 bg-gradient-to-r from-[var(--electric)] to-[var(--violet)] text-white border-0"
                >
                  <Play className="h-3.5 w-3.5 mr-1.5" />
                  Run Demo
                </Button>
                <button
                  onClick={() => {
                    openVisualGuide();
                    setMobileOpen(false);
                  }}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-[var(--amber)]/25 bg-[var(--amber)]/10 px-3 text-xs font-semibold text-[var(--amber)]"
                >
                  <Route className="h-3.5 w-3.5" />
                  Guide
                </button>
              </div>
              <button
                onClick={() => {
                  openPresentation();
                  setMobileOpen(false);
                }}
                className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-border/60 bg-white/[0.04] px-3 text-xs font-medium"
              >
                <Presentation className="h-3.5 w-3.5" />
                Presentation Mode
              </button>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto p-3">
              {mobileNav.map((item) => {
                const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition focus-visible:ring-2 focus-visible:ring-[var(--ring)]/55",
                      active
                        ? "bg-gradient-to-r from-[oklch(0.72_0.18_250/0.18)] to-[oklch(0.68_0.22_295/0.12)] text-foreground"
                        : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
                    )}
                  >
                    <Icon
                      className={cn("h-4 w-4", active ? "text-[var(--electric)]" : "text-inherit")}
                    />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <Link
              to="/about"
              onClick={() => setMobileOpen(false)}
              className="mx-3 mb-3 flex items-center gap-3 rounded-xl border border-[var(--electric)]/20 bg-white/[0.035] p-3"
            >
              <img
                src="/Raja.jpg"
                alt="Raja"
                className="h-12 w-12 rounded-full border border-[var(--electric)] object-cover object-[50%_10%]"
              />
              <div className="min-w-0">
                <div className="text-sm font-semibold">Raja</div>
                <div className="text-xs font-semibold text-[var(--amber)]">AI Agent Builder</div>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--electric)]">
                  @NUVRAJLABS
                </div>
              </div>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
