import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, Panel, StatBadge } from "@/components/ui/page";
import { memoryCards } from "@/lib/mock-data";

export const Route = createFileRoute("/memory")({
  head: () => ({
    meta: [
      { title: "Memory Explorer — AI Agent Studio" },
      {
        name: "description",
        content: "Inspect session memory, long-term store, retrieved chunks and vector results.",
      },
    ],
  }),
  component: MemoryPage,
});

function MemoryPage() {
  const [selected, setSelected] = useState(memoryCards[0].id);
  const m = memoryCards.find((x) => x.id === selected)!;
  const ctxUsed = 68;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Memory Explorer"
        description="Visualize what the agents remember, retrieve and forget."
      />

      <Panel>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-sm font-semibold">Context window usage</div>
            <div className="text-xs text-muted-foreground">
              87,420 / 128,000 tokens used in current run
            </div>
          </div>
          <StatBadge tone="info">{ctxUsed}% utilized</StatBadge>
        </div>
        <div className="mt-3 h-3 rounded-full bg-white/5 overflow-hidden border border-border/60">
          <div
            className="h-full bg-gradient-to-r from-[var(--electric)] via-[var(--cyan)] to-[var(--violet)]"
            style={{ width: `${ctxUsed}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
          <span>0</span>
          <span>32K</span>
          <span>64K</span>
          <span>96K</span>
          <span>128K</span>
        </div>
      </Panel>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {memoryCards.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelected(c.id)}
              className={`text-left rounded-2xl glass p-4 hover:bg-white/[0.06] transition ${selected === c.id ? "ring-1 ring-[var(--electric)]/40" : ""}`}
            >
              <div className="flex items-center justify-between">
                <StatBadge
                  tone={
                    c.kind === "Session"
                      ? "info"
                      : c.kind === "Long-term"
                        ? "default"
                        : c.kind === "Vector"
                          ? "success"
                          : "warn"
                  }
                >
                  {c.kind}
                </StatBadge>
                <span className="text-[11px] text-muted-foreground">fresh {c.fresh}%</span>
              </div>
              <div className="mt-2 text-sm font-semibold">{c.title}</div>
              <div className="mt-1 text-xs text-muted-foreground line-clamp-3">{c.body}</div>
              <div className="mt-3 h-1 rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--emerald)] to-[var(--cyan)]"
                  style={{ width: `${c.fresh}%` }}
                />
              </div>
            </button>
          ))}
        </div>

        <Panel>
          <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Selected memory
          </div>
          <div className="mt-1 text-lg font-semibold">{m.title}</div>
          <StatBadge tone="info">{m.kind}</StatBadge>
          <p className="mt-3 text-sm text-muted-foreground">{m.body}</p>

          <div className="mt-4 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Vector search
          </div>
          <div className="mt-2 space-y-1.5">
            {[
              { id: "chunk_8421", score: 0.94 },
              { id: "chunk_8120", score: 0.91 },
              { id: "chunk_7910", score: 0.88 },
              { id: "chunk_7710", score: 0.83 },
            ].map((r) => (
              <div key={r.id} className="flex items-center gap-3 text-xs">
                <span className="font-mono text-muted-foreground">{r.id}</span>
                <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[var(--electric)] to-[var(--violet)]"
                    style={{ width: `${r.score * 100}%` }}
                  />
                </div>
                <span className="tabular-nums w-10 text-right">{r.score.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
