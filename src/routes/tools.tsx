import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader, Panel, StatBadge, StatusDot } from "@/components/ui/page";
import { tools } from "@/lib/mock-data";
import { getTools, type ApiToolSummary } from "@/lib/api/client";

export const Route = createFileRoute("/tools")({
  head: () => ({
    meta: [
      { title: "Tool Registry — OmniAgents" },
      {
        name: "description",
        content: "MCP / tool catalog: permissions, latency, success rate and errors.",
      },
    ],
  }),
  component: ToolsPage,
});

function ToolsPage() {
  const [backendTools, setBackendTools] = useState<ApiToolSummary[] | null>(null);
  const [apiAvailable, setApiAvailable] = useState(false);

  useEffect(() => {
    let active = true;
    getTools()
      .then((nextTools) => {
        if (!active) return;
        setBackendTools(nextTools);
        setApiAvailable(true);
      })
      .catch(() => {
        if (!active) return;
        setBackendTools(null);
        setApiAvailable(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const displayTools = useMemo(() => {
    if (!backendTools?.length) {
      return tools.map((tool, index) => ({
        id: `static-${tool.name.toLowerCase().replace(/\s+/g, "-")}`,
        name: tool.name,
        description: "Static demo connector profile.",
        category: "demo",
        originLabel: "static fallback",
        connected: tool.connected,
        perms: tool.perms,
        latency: tool.latency,
        success: tool.success,
        errors: tool.errors,
        lastUsed: tool.lastUsed,
        sort: index,
      }));
    }

    return backendTools.map((tool, index) => {
      const staticMatch =
        tools.find((item) => item.name.toLowerCase() === tool.name.toLowerCase()) ??
        tools[index % tools.length];
      return {
        id: tool.id,
        name: tool.name,
        description: tool.description,
        category: tool.category,
        originLabel:
          tool.origin?.type === "mcp"
            ? `MCP · ${tool.origin.serverId ?? "server"}`
            : tool.origin?.type === "local"
              ? "local backend"
              : "server registry",
        connected: true,
        perms: tool.category,
        latency: staticMatch?.latency ?? 120 + index * 20,
        success: staticMatch?.success ?? 99.2,
        errors: staticMatch?.errors ?? 0,
        lastUsed: staticMatch?.lastUsed ?? "available",
        sort: index,
      };
    });
  }, [backendTools]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tool Registry"
        description="Every external capability your agents can call, with permissions and SLOs."
        actions={
          <StatBadge tone={apiAvailable ? "success" : "warn"}>
            {apiAvailable ? "Backend registry" : "Static fallback"}
          </StatBadge>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {displayTools.map((t) => (
          <div key={t.id} className="rounded-2xl glass p-5">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <StatusDot status={t.connected ? "success" : "idle"} />
                  <div className="truncate font-semibold tracking-tight">{t.name}</div>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Permissions: <span className="font-mono">{t.perms}</span>
                </div>
                <div className="mt-1 line-clamp-2 text-xs text-muted-foreground/80">
                  {t.description}
                </div>
              </div>
              <StatBadge tone={t.connected ? "success" : "default"}>
                {t.connected ? "Connected" : "Disconnected"}
              </StatBadge>
            </div>

            {t.connected ? (
              <>
                <div className="mt-4 grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
                  <Stat label="Latency" value={`${t.latency}ms`} />
                  <Stat label="Success" value={`${t.success}%`} />
                  <Stat label="Errors" value={`${t.errors}`} />
                </div>
                <div className="mt-3 text-[11px] text-muted-foreground">Last used {t.lastUsed}</div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  {t.originLabel}
                </div>
              </>
            ) : (
              <div className="mt-4 rounded-lg border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
                Not connected. Configure in Settings → Integrations.
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/[0.03] border border-border/60 px-2.5 py-1.5">
      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}
