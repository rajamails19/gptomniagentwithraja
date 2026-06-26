import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { GitCompare, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, StatBadge } from "@/components/ui/page";
import { prompts } from "@/lib/mock-data";
import { toast } from "sonner";

export const Route = createFileRoute("/prompts")({
  head: () => ({
    meta: [
      { title: "Prompt Library — GPT Omni Agents" },
      {
        name: "description",
        content: "Manage, test, and version prompts across agents, tools and safety policies.",
      },
    ],
  }),
  component: PromptsPage,
});

function PromptsPage() {
  const [selected, setSelected] = useState(prompts[0].id);
  const p = prompts.find((x) => x.id === selected)!;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prompt Library"
        description="Production-grade prompt ops: versioning, testing and performance scoring."
      />

      <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-4">
        <Panel className="p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-border/60 text-sm font-semibold">
            All prompts
          </div>
          <div className="divide-y divide-border/60">
            {prompts.map((pr) => (
              <button
                key={pr.id}
                onClick={() => setSelected(pr.id)}
                className={`w-full text-left px-4 py-3 hover:bg-white/[0.04] ${selected === pr.id ? "bg-white/[0.06]" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium truncate">{pr.name}</div>
                  <StatBadge tone="info">{pr.version}</StatBadge>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>
                    {pr.category} · {pr.runs.toLocaleString()} runs
                  </span>
                  <span>edited {pr.edited}</span>
                </div>
                <div className="mt-2 h-1 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[var(--electric)] to-[var(--violet)]"
                    style={{ width: `${pr.score}%` }}
                  />
                </div>
              </button>
            ))}
          </div>
        </Panel>

        <Panel>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">{p.name}</div>
              <div className="text-xs text-muted-foreground">
                {p.category} · {p.version} · score {p.score}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <GitCompare className="h-3.5 w-3.5 mr-1.5" /> Compare versions
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  toast.success("Test run queued", { description: `${p.name} · ${p.version}` })
                }
                className="bg-gradient-to-r from-[var(--electric)] to-[var(--violet)] text-white border-0"
              >
                <Play className="h-3.5 w-3.5 mr-1.5" /> Test
              </Button>
            </div>
          </div>

          <textarea
            defaultValue={`You are the ${p.name}.
Always reason in 3 steps:
1. Restate the goal.
2. Identify required tools and memory.
3. Produce strict JSON output matching the contract.

Be concise. Cite source IDs. Never invent APIs.`}
            rows={14}
            className="mt-4 w-full rounded-lg bg-black/40 border border-border/60 p-4 text-xs font-mono text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/40"
          />

          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <Field k="Avg latency" v="820ms" />
            <Field k="Avg tokens" v="1,248" />
            <Field k="Cost / run" v="$0.04" />
            <Field k="Success" v={`${p.score}%`} />
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Field({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg bg-white/[0.03] border border-border/60 px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{k}</div>
      <div className="text-sm font-semibold tabular-nums">{v}</div>
    </div>
  );
}
