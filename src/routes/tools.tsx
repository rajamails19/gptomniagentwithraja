import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, StatBadge, StatusDot } from "@/components/ui/page";
import { tools } from "@/lib/mock-data";

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
  return (
    <div className="space-y-6">
      <PageHeader
        title="Tool Registry"
        description="Every external capability your agents can call, with permissions and SLOs."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {tools.map((t) => (
          <div key={t.name} className="rounded-2xl glass p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <StatusDot status={t.connected ? "success" : "idle"} />
                  <div className="font-semibold tracking-tight">{t.name}</div>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Permissions: <span className="font-mono">{t.perms}</span>
                </div>
              </div>
              <StatBadge tone={t.connected ? "success" : "default"}>
                {t.connected ? "Connected" : "Disconnected"}
              </StatBadge>
            </div>

            {t.connected ? (
              <>
                <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                  <Stat label="Latency" value={`${t.latency}ms`} />
                  <Stat label="Success" value={`${t.success}%`} />
                  <Stat label="Errors" value={`${t.errors}`} />
                </div>
                <div className="mt-3 text-[11px] text-muted-foreground">Last used {t.lastUsed}</div>
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
