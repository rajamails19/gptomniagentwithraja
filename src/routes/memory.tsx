import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader, Panel, StatBadge } from "@/components/ui/page";
import { getMemories } from "@/lib/api/client";
import type { ApiMemory, ApiMemoryScope } from "@/lib/api/schemas";
import { memoryCards } from "@/lib/mock-data";

export const Route = createFileRoute("/memory")({
  head: () => ({
    meta: [
      { title: "Memory Explorer — OmniAgents" },
      {
        name: "description",
        content: "Inspect run memory, workflow memory, and global demo memory.",
      },
    ],
  }),
  component: MemoryPage,
});

const scopes: Array<ApiMemoryScope | "all"> = ["all", "run", "workflow", "global"];

function MemoryPage() {
  const [memories, setMemories] = useState<ApiMemory[]>([]);
  const [scope, setScope] = useState<ApiMemoryScope | "all">("all");
  const [agent, setAgent] = useState("all");
  const [scenario, setScenario] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    let active = true;
    getMemories()
      .then((next) => {
        if (!active) return;
        setMemories(next);
        setSelectedId((value) => value ?? next[0]?.id ?? null);
        setUsingFallback(false);
      })
      .catch(() => {
        if (!active) return;
        setUsingFallback(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const fallbackMemories = useMemo<ApiMemory[]>(
    () =>
      memoryCards.map((card) => ({
        id: card.id,
        scope: card.kind === "Session" ? "run" : card.kind === "Long-term" ? "workflow" : "global",
        runId: card.kind === "Session" ? "demo_run" : null,
        scenarioId: "api-docs-generation",
        agentId: card.kind === "Vector" ? "research" : "planner",
        content: card.body,
        tags: [card.kind.toLowerCase(), "demo"],
        importance: card.fresh,
        source: "static_fallback",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
    [],
  );

  const displayMemories = memories.length > 0 ? memories : fallbackMemories;
  const agents = [...new Set(displayMemories.map((memory) => memory.agentId).filter(Boolean))];
  const scenarios = [
    ...new Set(displayMemories.map((memory) => memory.scenarioId).filter(Boolean)),
  ];
  const filtered = displayMemories.filter((memory) => {
    if (scope !== "all" && memory.scope !== scope) return false;
    if (agent !== "all" && memory.agentId !== agent) return false;
    if (scenario !== "all" && memory.scenarioId !== scenario) return false;
    return true;
  });
  const selected = filtered.find((memory) => memory.id === selectedId) ?? filtered[0];
  const scopeCounts = scopes.slice(1).map((item) => ({
    scope: item,
    count: displayMemories.filter((memory) => memory.scope === item).length,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Memory Explorer"
        description="Inspect run memory, workflow memory, and global demo memory used by agents."
        actions={
          <StatBadge tone={usingFallback ? "warn" : "success"}>
            {usingFallback ? "Static fallback" : "Backend memory"}
          </StatBadge>
        }
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {scopeCounts.map((item) => (
          <Panel key={item.scope}>
            <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              {item.scope} memory
            </div>
            <div className="mt-1 text-3xl font-semibold">{item.count}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {item.scope === "run"
                ? "Current execution context"
                : item.scope === "workflow"
                  ? "Reusable scenario knowledge"
                  : "Shared demo knowledge"}
            </div>
          </Panel>
        ))}
      </div>

      <Panel>
        <div className="grid gap-3 sm:grid-cols-3">
          <Filter label="Scope" value={scope} onChange={(value) => setScope(value as typeof scope)}>
            {scopes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Filter>
          <Filter label="Agent" value={agent} onChange={setAgent}>
            <option value="all">all</option>
            {agents.map((item) => (
              <option key={item} value={item ?? ""}>
                {item}
              </option>
            ))}
          </Filter>
          <Filter label="Scenario" value={scenario} onChange={setScenario}>
            <option value="all">all</option>
            {scenarios.map((item) => (
              <option key={item} value={item ?? ""}>
                {item}
              </option>
            ))}
          </Filter>
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_380px]">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {filtered.map((memory) => (
            <button
              key={memory.id}
              onClick={() => setSelectedId(memory.id)}
              className={`text-left rounded-2xl glass p-4 transition hover:bg-white/[0.06] ${
                selected?.id === memory.id ? "ring-1 ring-[var(--electric)]/50" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <StatBadge
                  tone={
                    memory.scope === "run"
                      ? "info"
                      : memory.scope === "workflow"
                        ? "success"
                        : "warn"
                  }
                >
                  {memory.scope}
                </StatBadge>
                <span className="text-[11px] text-muted-foreground">
                  importance {memory.importance}
                </span>
              </div>
              <div className="mt-3 text-sm text-muted-foreground line-clamp-3">
                {memory.content}
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {memory.tags.slice(0, 4).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md border border-border/60 bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>

        <Panel>
          {selected ? (
            <>
              <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Selected memory
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <StatBadge tone="info">{selected.scope}</StatBadge>
                <StatBadge tone="default">{selected.source}</StatBadge>
              </div>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">{selected.content}</p>
              <div className="mt-5 space-y-2 text-xs">
                <Detail label="ID" value={selected.id} />
                <Detail label="Run" value={selected.runId ?? "not scoped"} />
                <Detail label="Scenario" value={selected.scenarioId ?? "global"} />
                <Detail label="Agent" value={selected.agentId ?? "shared"} />
                <Detail label="Created" value={new Date(selected.createdAt).toLocaleString()} />
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">
              No memories match the current filters.
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Filter({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-border/60 bg-white/5 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/55"
      >
        {children}
      </select>
    </label>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-2 first:border-t-0 first:pt-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate text-right font-mono">{value}</span>
    </div>
  );
}
