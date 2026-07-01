import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Workflow,
  Bot,
  GitBranch,
  Bug,
  Activity,
  BookText,
  Brain,
  Wrench,
  DollarSign,
  ClipboardCheck,
  ShieldCheck,
  Settings,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
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
  { to: "/guardrails", label: "Guardrails", icon: ShieldCheck },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/about", label: "About Raja", icon: Sparkles },
] as const;

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="hidden md:flex md:w-56 lg:w-64 shrink-0 flex-col border-r border-border/60 bg-sidebar/60 backdrop-blur-xl">
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-border/60">
        <div className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[oklch(0.7_0.2_250)] to-[oklch(0.6_0.22_295)] glow-primary">
          <Sparkles className="h-4.5 w-4.5 text-white" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight">OmniAgents</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            NuvRajLabs
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {nav.map((item) => {
          const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              data-guide={`nav-${item.to === "/" ? "dashboard" : item.to.slice(1)}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-[background,color,transform,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                active
                  ? "bg-gradient-to-r from-[oklch(0.72_0.18_250/0.18)] to-[oklch(0.68_0.22_295/0.12)] text-foreground shadow-[inset_0_1px_0_oklch(1_0_0/0.05)]"
                  : "text-muted-foreground hover:translate-x-0.5 hover:bg-white/5 hover:text-foreground",
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-gradient-to-b from-[var(--electric)] to-[var(--violet)]" />
              )}
              <Icon
                className={cn(
                  "h-4 w-4 transition-colors duration-200",
                  active ? "text-[var(--electric)]" : "group-hover:text-[var(--cyan)]",
                )}
              />
              <span className="font-medium tracking-tight">{item.label}</span>
            </Link>
          );
        })}

        <Link
          to="/about"
          data-guide="about-founder"
          aria-label="About Raja and NuvRajLabs"
          className="group mt-3 block rounded-2xl border border-[var(--electric)]/20 bg-white/[0.035] p-3 text-center transition duration-200 hover:-translate-y-0.5 hover:border-[var(--electric)]/45 hover:bg-white/[0.055] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]/60"
        >
          <div className="mx-auto h-20 w-20 overflow-hidden rounded-full border-2 border-[var(--electric)] shadow-[0_0_30px_oklch(0.72_0.2_250/0.28)]">
            <img
              src="/Raja.jpg"
              alt="Raja"
              className="h-full w-full object-cover object-[50%_10%]"
            />
          </div>
          <div className="mt-2 text-sm font-semibold leading-tight text-foreground">Raja</div>
          <div className="mt-1 space-y-0.5 leading-tight">
            <div className="text-[12px] font-semibold text-[var(--cyan)]">
              Founder &amp; Visionary
            </div>
            <div className="text-[12px] font-semibold italic text-[var(--amber)]">
              AI Agent Builder
            </div>
          </div>
          <div className="mt-2 font-mono text-[13px] font-semibold uppercase tracking-[0.2em] text-[var(--electric)] drop-shadow-[0_0_12px_oklch(0.72_0.2_250/0.45)]">
            @NUVRAJLABS
          </div>
          <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
            Building enterprise agent control-room demos.
          </p>
        </Link>
      </nav>

      <div className="mx-3 mb-3 rounded-xl glass p-3">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">System</div>
        <div className="mt-1 flex items-center gap-2 text-xs">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--emerald)] opacity-60 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--emerald)]" />
          </span>
          All systems operational
        </div>
        <div className="mt-2 text-[11px] text-muted-foreground">
          Founder-built · 12 agents · 11 tools
        </div>
      </div>
    </aside>
  );
}
