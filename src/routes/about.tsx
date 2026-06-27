import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Bot, Code2, Eye, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageHeader, Panel, StatBadge } from "@/components/ui/page";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Raja — OmniAgents" },
      {
        name: "description",
        content: "OmniAgents is an AI agent control-room project built by Raja at NuvRajLabs.",
      },
    ],
  }),
  component: AboutPage,
});

const signals = [
  { label: "Multi-agent orchestration", icon: Bot },
  { label: "Execution traces and debugging", icon: Eye },
  { label: "Tools, MCP, and backend foundation", icon: Code2 },
  { label: "Governance and cost visibility", icon: ShieldCheck },
];

function AboutPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Raja · NuvRajLabs"
        description="Builder of OmniAgents, an AI agent control room for planning, running, debugging, and governing multi-agent workflows."
        actions={
          <Button
            asChild
            className="bg-gradient-to-r from-[var(--electric)] to-[var(--violet)] text-white border-0"
          >
            <Link to="/">
              Back to Dashboard <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        }
      />

      <section className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <Panel className="text-center">
          <div className="mx-auto h-36 w-36 overflow-hidden rounded-full border-4 border-[var(--electric)] shadow-[0_0_48px_oklch(0.72_0.2_250/0.3)]">
            <img
              src="/Raja.jpg"
              alt="Raja"
              className="h-full w-full object-cover object-[50%_10%]"
            />
          </div>
          <h2 className="mt-4 text-2xl font-semibold">Raja</h2>
          <div className="mt-2 space-y-1 leading-tight">
            <div className="text-sm font-semibold text-[var(--cyan)]">Business Entrepreneur</div>
            <div className="text-sm font-semibold italic text-[var(--amber)]">
              Products &amp; Apps Innovator
            </div>
          </div>
          <div className="mt-5 flex justify-center">
            <span className="rounded-lg border border-[var(--electric)]/25 bg-[var(--electric)]/10 px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-[0.22em] text-[var(--electric)] shadow-[0_0_24px_-12px_oklch(0.72_0.2_250/0.8)]">
              @NUVRAJLABS
            </span>
          </div>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Building practical AI agent products with real workflows, observable execution, and
            founder-level attention to the full demo experience.
          </p>
        </Panel>

        <Panel>
          <div className="max-w-4xl">
            <div className="flex flex-wrap gap-2">
              <StatBadge tone="success">Founder-built</StatBadge>
              <StatBadge tone="info">Client-ready demo</StatBadge>
              <StatBadge tone="warn">Product direction</StatBadge>
            </div>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight">
              OmniAgents is built to show what serious AI agent software should feel like.
            </h2>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              The goal is simple: when someone sees this project, they should understand that it is
              more than a static UI. It demonstrates how a real control room could coordinate
              planner agents, specialist agents, tools, memory, traces, costs, final artifacts, and
              governance in one place.
            </p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              NuvRajLabs is the company name behind this build. The direction is enterprise AI
              orchestration: product demos that are polished enough for investors and technical
              enough for engineering leaders.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {signals.map((signal) => {
                const Icon = signal.icon;
                return (
                  <div
                    key={signal.label}
                    className="flex items-center gap-3 rounded-xl border border-border/60 bg-white/[0.03] p-3 text-sm"
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/[0.06] text-[var(--cyan)]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="font-medium">{signal.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Panel>
      </section>
    </div>
  );
}
