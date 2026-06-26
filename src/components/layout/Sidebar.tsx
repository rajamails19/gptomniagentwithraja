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
  { to: "/settings", label: "Settings", icon: Settings },
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
          <div className="text-sm font-semibold tracking-tight">AI Agent Studio</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Control Room
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
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all relative",
                active
                  ? "bg-gradient-to-r from-[oklch(0.72_0.18_250/0.18)] to-[oklch(0.68_0.22_295/0.12)] text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5",
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-gradient-to-b from-[var(--electric)] to-[var(--violet)]" />
              )}
              <Icon className={cn("h-4 w-4", active && "text-[var(--electric)]")} />
              <span className="font-medium tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="m-3 rounded-xl glass p-3">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">System</div>
        <div className="mt-1 flex items-center gap-2 text-xs">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--emerald)] opacity-60 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--emerald)]" />
          </span>
          All systems operational
        </div>
        <div className="mt-2 text-[11px] text-muted-foreground">
          12 agents · 4 models · 11 tools
        </div>
      </div>
    </aside>
  );
}
