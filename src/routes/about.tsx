import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Bot,
  Code2,
  Eye,
  ShieldCheck,
  Github,
  Linkedin,
  Mail,
  ExternalLink,
  Sparkles,
  Zap,
  Database,
  Globe,
  CalendarCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Panel, StatBadge } from "@/components/ui/page";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Raja — OmniAgents by NuvRajLabs" },
      {
        name: "description",
        content:
          "OmniAgents is a founder-built AI agent control room by Raja at NuvRajLabs. Request a demo or connect on LinkedIn.",
      },
    ],
  }),
  component: AboutPage,
});

const TECH_STACK = [
  { label: "TanStack Start", sub: "SSR + routing", icon: Zap, color: "var(--electric)" },
  { label: "SQLite / Drizzle", sub: "Persistent runs", icon: Database, color: "var(--cyan)" },
  { label: "SSE streaming", sub: "Live events", icon: Globe, color: "var(--emerald)" },
  { label: "Radix UI", sub: "Accessible components", icon: Sparkles, color: "var(--violet)" },
  { label: "Tailwind v4", sub: "Dark/light theming", icon: Code2, color: "var(--amber)" },
  { label: "Recharts", sub: "Cost analytics", icon: Eye, color: "var(--cyan)" },
];

const CAPABILITIES = [
  { label: "Multi-agent orchestration", icon: Bot },
  { label: "Live SSE execution traces", icon: Eye },
  { label: "Tools, MCP & backend foundation", icon: Code2 },
  { label: "Human-in-the-loop approval gates", icon: ShieldCheck },
];

const SOCIAL_LINKS = [
  {
    label: "LinkedIn",
    sub: "Connect professionally",
    href: "https://www.linkedin.com/in/nuvrajlabs",
    icon: Linkedin,
    color: "text-[#0A66C2]",
    bg: "bg-[#0A66C2]/10 hover:bg-[#0A66C2]/20 border-[#0A66C2]/25 hover:border-[#0A66C2]/50",
  },
  {
    label: "GitHub",
    sub: "View source code",
    href: "https://github.com/nuvrajlabs",
    icon: Github,
    color: "text-foreground",
    bg: "bg-white/[0.04] hover:bg-white/[0.08] border-border/60 hover:border-border",
  },
  {
    label: "Email",
    sub: "raja@nuvrajlabs.com",
    href: "mailto:raja@nuvrajlabs.com",
    icon: Mail,
    color: "text-[var(--amber)]",
    bg: "bg-[var(--amber)]/10 hover:bg-[var(--amber)]/20 border-[var(--amber)]/25 hover:border-[var(--amber)]/50",
  },
];

function AboutPage() {
  return (
    <div className="space-y-8 max-w-6xl mx-auto">

      {/* Hero strip */}
      <div className="rounded-2xl border border-[var(--electric)]/20 bg-gradient-to-br from-[oklch(0.72_0.18_250/0.08)] to-[oklch(0.68_0.22_295/0.06)] p-6 sm:p-10 flex flex-col sm:flex-row gap-8 items-center">
        {/* Avatar */}
        <div className="shrink-0 relative">
          <div className="h-32 w-32 sm:h-40 sm:w-40 overflow-hidden rounded-full border-4 border-[var(--electric)] shadow-[0_0_60px_oklch(0.72_0.2_250/0.35)]">
            <img
              src="/Raja.jpg"
              alt="Raja"
              className="h-full w-full object-cover object-[50%_10%]"
            />
          </div>
          <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--emerald)] border-2 border-background shadow">
            <span className="text-[10px]">✓</span>
          </span>
        </div>

        {/* Copy */}
        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-wrap justify-center sm:justify-start gap-2 mb-3">
            <StatBadge tone="success">Founder-built</StatBadge>
            <StatBadge tone="info">Client-ready demo</StatBadge>
            <StatBadge tone="warn">Open to collaborate</StatBadge>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            Raja{" "}
            <span className="font-mono text-lg text-[var(--electric)] tracking-[0.18em]">
              @NUVRAJLABS
            </span>
          </h1>
          <p className="mt-1 text-sm font-semibold text-[var(--cyan)]">
            Business Entrepreneur · Products &amp; Apps Innovator · AI Agent Builder
          </p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground max-w-xl">
            Building practical AI agent products with real workflows, observable execution, and
            founder-level attention to the full demo experience. OmniAgents is the flagship
            example — a production-grade control room for multi-agent AI systems.
          </p>

          {/* Social links */}
          <div className="mt-5 flex flex-wrap justify-center sm:justify-start gap-2">
            {SOCIAL_LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all duration-200 hover:-translate-y-px ${link.bg} ${link.color}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{link.label}</span>
                  <ExternalLink className="h-2.5 w-2.5 opacity-50" />
                </a>
              );
            })}
          </div>
        </div>

        {/* Request Demo CTA */}
        <div className="shrink-0 flex flex-col items-center gap-3 rounded-xl border border-[var(--electric)]/30 bg-[var(--electric)]/5 p-5 text-center min-w-[180px]">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-[var(--electric)] to-[var(--violet)]">
            <CalendarCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold">Request a Demo</div>
            <div className="mt-0.5 text-[11px] text-muted-foreground leading-4">
              Live walkthrough for<br />investors &amp; engineering teams
            </div>
          </div>
          <a
            href="mailto:raja@nuvrajlabs.com?subject=OmniAgents%20Demo%20Request&body=Hi%20Raja%2C%0A%0AI%27d%20love%20to%20see%20a%20live%20demo%20of%20OmniAgents.%0A%0ACompany%3A%0AUse%20case%3A%0AAvailability%3A"
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-[var(--electric)] to-[var(--violet)] px-4 py-2 text-xs font-semibold text-white shadow-[0_8px_24px_-12px_oklch(0.7_0.2_265/0.7)] transition-all hover:opacity-90 hover:-translate-y-px"
          >
            Book a call <ArrowRight className="h-3 w-3" />
          </a>
          <Link
            to="/"
            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Or explore the demo →
          </Link>
        </div>
      </div>

      {/* What this demonstrates */}
      <Panel>
        <div className="max-w-4xl">
          <h2 className="text-xl font-semibold tracking-tight">
            OmniAgents shows what serious AI agent software should feel like.
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            The goal: when someone sees this project, they understand it's more than a static UI.
            It demonstrates how a real control room coordinates planner agents, specialist agents,
            tools, memory, traces, costs, human-approval gates, and final artifacts — all in one
            place, with live SSE streaming and a SQLite-backed persistent run history.
          </p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            NuvRajLabs is the company behind this build. The direction is enterprise AI
            orchestration — demos polished enough for investors and technical enough for
            engineering leaders.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {CAPABILITIES.map((cap) => {
              const Icon = cap.icon;
              return (
                <div
                  key={cap.label}
                  className="flex items-center gap-3 rounded-xl border border-border/60 bg-white/[0.03] p-3 text-sm"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/[0.06] text-[var(--cyan)]">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="font-medium">{cap.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </Panel>

      {/* Tech stack */}
      <div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-3 px-1">
          Built with
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {TECH_STACK.map((tech) => {
            const Icon = tech.icon;
            return (
              <div
                key={tech.label}
                className="rounded-xl border border-border/60 bg-white/[0.03] p-3 text-center hover:bg-white/[0.06] transition-colors"
              >
                <div
                  className="mx-auto mb-2 grid h-8 w-8 place-items-center rounded-lg"
                  style={{ background: `color-mix(in oklch, ${tech.color} 15%, transparent)` }}
                >
                  <Icon className="h-4 w-4" style={{ color: tech.color }} />
                </div>
                <div className="text-xs font-semibold">{tech.label}</div>
                <div className="mt-0.5 text-[10px] text-muted-foreground">{tech.sub}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live demo CTA banner */}
      <div className="rounded-2xl border border-[var(--violet)]/25 bg-gradient-to-r from-[oklch(0.68_0.22_295/0.08)] to-[oklch(0.72_0.18_250/0.06)] p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="text-lg font-semibold">See it live right now</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Run a workflow, watch live SSE events stream in, then drill into cost breakdowns.
          </div>
        </div>
        <div className="flex gap-3 shrink-0">
          <Button asChild className="bg-gradient-to-r from-[var(--electric)] to-[var(--violet)] text-white border-0">
            <Link to="/workflow">
              Run Demo <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="border-border/60">
            <Link to="/cost">
              Cost Analytics
            </Link>
          </Button>
        </div>
      </div>

    </div>
  );
}
