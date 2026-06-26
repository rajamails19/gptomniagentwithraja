import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Activity, Braces, ClipboardList, Server } from "lucide-react";

import { PageHeader, Panel, StatBadge, StatusBadge } from "@/components/ui/page";
import {
  getApiLogs,
  getApiRoutes,
  getHealth,
  type ApiHealth,
  type ApiRequestLog,
  type RegisteredApiRoute,
} from "@/lib/api/client";

export const Route = createFileRoute("/developer/api")({
  head: () => ({ meta: [{ title: "API Explorer — GPT Omni Agents" }] }),
  component: DeveloperApiPage,
});

const sampleRequests = [
  "curl http://localhost:8080/api/v1/health",
  "curl http://localhost:8080/api/v1/scenarios",
  "curl http://localhost:8080/api/v1/runs",
  'curl -X POST http://localhost:8080/api/v1/runs -H "content-type: application/json" -d \'{"scenarioId":"pull-request-review"}\'',
  "curl http://localhost:8080/api/v1/runs/exec_pr_104/trace",
  "curl http://localhost:8080/api/v1/runs/exec_pr_104/artifact",
];

function DeveloperApiPage() {
  const [health, setHealth] = useState<ApiHealth | null>(null);
  const [routes, setRoutes] = useState<RegisteredApiRoute[]>([]);
  const [logs, setLogs] = useState<ApiRequestLog[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadApiExplorer() {
      try {
        const [nextHealth, nextRoutes, nextLogs] = await Promise.all([
          getHealth(),
          getApiRoutes(),
          getApiLogs(),
        ]);
        if (!active) return;
        setHealth(nextHealth);
        setRoutes(nextRoutes);
        setLogs(nextLogs);
        setError(null);
      } catch (apiError) {
        if (!active) return;
        setError(apiError instanceof Error ? apiError.message : "API explorer failed to load.");
      }
    }

    void loadApiExplorer();
    const interval = window.setInterval(loadApiExplorer, 6000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const sampleResponse = useMemo(
    () => ({
      success: true,
      data: health ?? {
        ok: true,
        service: "GPT Omni Agents API",
        version: "v1",
        mode: "in-memory",
      },
      timestamp: new Date().toISOString(),
      requestId: "req_example",
    }),
    [health],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="API Explorer"
        description="Hidden developer surface for validating the real backend foundation during demos."
        actions={
          <StatusBadge
            status={health?.ok ? "success" : "waiting"}
            label={health ? "API online" : "Checking"}
          />
        }
      />

      {error && (
        <Panel className="border-destructive/30 bg-destructive/5">
          <div className="text-sm font-semibold text-destructive">API explorer unavailable</div>
          <p className="mt-1 text-xs text-muted-foreground">{error}</p>
        </Panel>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Panel>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Server className="h-4 w-4 text-[var(--cyan)]" />
            API status
          </div>
          <div className="mt-4 space-y-3 text-sm">
            {[
              ["Service", health?.service ?? "Loading"],
              ["Version", health?.version ?? "v1"],
              ["Mode", health?.mode ?? "Checking"],
              ["Scenarios", String(health?.scenarioCount ?? "-")],
              ["Runs", String(health?.runCount ?? "-")],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium">{value}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="xl:col-span-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ClipboardList className="h-4 w-4 text-[var(--emerald)]" />
            Registered routes
          </div>
          <div className="mt-4 overflow-hidden rounded-xl border border-border/60">
            <div className="max-h-[360px] overflow-auto">
              {routes.map((route) => (
                <div
                  key={`${route.method}-${route.path}`}
                  className="grid grid-cols-[72px_minmax(0,1fr)] gap-3 border-t border-border/60 px-3 py-2.5 text-xs first:border-t-0"
                >
                  <StatBadge tone={route.method === "GET" ? "info" : "success"}>
                    {route.method}
                  </StatBadge>
                  <div className="min-w-0">
                    <div className="truncate font-mono text-foreground">{route.path}</div>
                    <div className="mt-0.5 text-muted-foreground">{route.summary}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Braces className="h-4 w-4 text-[var(--violet)]" />
            Sample requests
          </div>
          <div className="mt-4 space-y-2">
            {sampleRequests.map((request) => (
              <pre
                key={request}
                className="overflow-x-auto rounded-lg border border-border/60 bg-black/20 p-3 text-[11px] text-muted-foreground"
              >
                {request}
              </pre>
            ))}
          </div>
        </Panel>

        <Panel>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Activity className="h-4 w-4 text-[var(--amber)]" />
            Sample response
          </div>
          <pre className="mt-4 max-h-[420px] overflow-auto rounded-lg border border-border/60 bg-black/20 p-3 text-[11px] text-muted-foreground">
            {JSON.stringify(sampleResponse, null, 2)}
          </pre>
        </Panel>
      </div>

      <Panel>
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Activity className="h-4 w-4 text-[var(--cyan)]" />
          Recent request logs
        </div>
        <div className="mt-4 overflow-hidden rounded-xl border border-border/60">
          {logs.length === 0 ? (
            <div className="p-4 text-xs text-muted-foreground">
              No API requests logged yet. Call an endpoint to populate this stream.
            </div>
          ) : (
            <div className="max-h-[360px] overflow-auto">
              {logs.map((log) => (
                <div
                  key={log.requestId}
                  className="grid grid-cols-1 gap-2 border-t border-border/60 px-3 py-2.5 text-xs first:border-t-0 md:grid-cols-[80px_1fr_80px_90px]"
                >
                  <StatBadge tone={log.status >= 400 ? "error" : "success"}>{log.status}</StatBadge>
                  <div className="min-w-0">
                    <div className="truncate font-mono">
                      {log.method} {log.path}
                    </div>
                    <div className="truncate text-muted-foreground">{log.requestId}</div>
                  </div>
                  <div className="text-muted-foreground">{log.durationMs}ms</div>
                  <div className="text-muted-foreground">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
