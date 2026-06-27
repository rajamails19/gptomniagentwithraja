import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Activity, Braces, ClipboardList, Server } from "lucide-react";

import { PageHeader, Panel, StatBadge, StatusBadge } from "@/components/ui/page";
import {
  getApiLogs,
  getApiRoutes,
  getExecutionLogs,
  getHealth,
  getMcpOverview,
  getRuns,
  getToolExecutions,
  getTools,
  type ApiHealth,
  type ApiMCPOverview,
  type ApiRequestLog,
  type ApiToolExecution,
  type ApiToolSummary,
  type RegisteredApiRoute,
} from "@/lib/api/client";
import type { ApiRun } from "@/lib/api/schemas";

export const Route = createFileRoute("/developer/api")({
  head: () => ({ meta: [{ title: "API Explorer — OmniAgents" }] }),
  component: DeveloperApiPage,
});

const sampleRequests = [
  "curl http://localhost:8080/api/v1/health",
  "curl http://localhost:8080/api/v1/scenarios",
  "curl http://localhost:8080/api/v1/runs",
  'curl -X POST http://localhost:8080/api/v1/runs -H "content-type: application/json" -d \'{"scenarioId":"pull-request-review"}\'',
  "curl -X POST http://localhost:8080/api/v1/runs/{id}/start",
  "curl http://localhost:8080/api/v1/runs/{id}/status",
  "curl -X POST http://localhost:8080/api/v1/runs/{id}/replay",
  'curl -X POST http://localhost:8080/api/v1/tools/openapi-inspector/execute -H "content-type: application/json" -d \'{"input":{"endpoints":[{"method":"GET","path":"/health","summary":"Health check"}]}}\'',
  "curl http://localhost:8080/api/v1/runs/exec_pr_104/trace",
  "curl http://localhost:8080/api/v1/runs/exec_pr_104/artifact",
];

function DeveloperApiPage() {
  const [health, setHealth] = useState<ApiHealth | null>(null);
  const [routes, setRoutes] = useState<RegisteredApiRoute[]>([]);
  const [logs, setLogs] = useState<ApiRequestLog[]>([]);
  const [runs, setRuns] = useState<ApiRun[]>([]);
  const [executionLogs, setExecutionLogs] = useState<unknown[]>([]);
  const [tools, setTools] = useState<ApiToolSummary[]>([]);
  const [toolExecutions, setToolExecutions] = useState<ApiToolExecution[]>([]);
  const [mcpOverview, setMcpOverview] = useState<ApiMCPOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadApiExplorer() {
      try {
        const [
          nextHealth,
          nextRoutes,
          nextLogs,
          nextRuns,
          nextExecutionLogs,
          nextTools,
          nextToolExecutions,
          nextMcpOverview,
        ] = await Promise.all([
          getHealth(),
          getApiRoutes(),
          getApiLogs(),
          getRuns(),
          getExecutionLogs(),
          getTools(),
          getToolExecutions(),
          getMcpOverview(),
        ]);
        if (!active) return;
        setHealth(nextHealth);
        setRoutes(nextRoutes);
        setLogs(nextLogs);
        setRuns(nextRuns);
        setExecutionLogs(nextExecutionLogs);
        setTools(nextTools);
        setToolExecutions(nextToolExecutions);
        setMcpOverview(nextMcpOverview);
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
        service: "OmniAgents API",
        version: "v1",
        mode: "in-memory",
      },
      timestamp: new Date().toISOString(),
      requestId: "req_example",
    }),
    [health],
  );
  const latestRun = runs.at(-1) ?? null;

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
            <Activity className="h-4 w-4 text-[var(--emerald)]" />
            Latest run lifecycle
          </div>
          {latestRun ? (
            <div className="mt-4 space-y-3 text-sm">
              {[
                ["Run", latestRun.id],
                ["Scenario", latestRun.scenarioId],
                ["Status", latestRun.status],
                ["Current step", latestRun.currentStepId ?? "none"],
                ["Cost", `$${latestRun.cost.toFixed(2)}`],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium">{value}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 text-xs text-muted-foreground">
              No persisted runs available yet.
            </div>
          )}
        </Panel>

        <Panel>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Activity className="h-4 w-4 text-[var(--amber)]" />
            Backend execution logs
          </div>
          <pre className="mt-4 max-h-[260px] overflow-auto rounded-lg border border-border/60 bg-black/20 p-3 text-[11px] text-muted-foreground">
            {JSON.stringify(executionLogs.slice(0, 8), null, 2)}
          </pre>
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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Panel>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Server className="h-4 w-4 text-[var(--cyan)]" />
            MCP servers
          </div>
          <div className="mt-4 space-y-2">
            {(mcpOverview?.servers ?? []).map((server) => (
              <div
                key={server.id}
                className="rounded-lg border border-border/60 bg-white/[0.03] p-3 text-xs"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-foreground">{server.id}</span>
                  <StatusBadge
                    status={server.status === "connected" ? "success" : "waiting"}
                    label={server.status}
                  />
                </div>
                <div className="mt-1 font-medium">{server.name}</div>
                <div className="mt-1 text-muted-foreground">
                  {server.toolCount} tools · {server.transport}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ClipboardList className="h-4 w-4 text-[var(--emerald)]" />
            MCP discovered tools
          </div>
          <pre className="mt-4 max-h-[360px] overflow-auto rounded-lg border border-border/60 bg-black/20 p-3 text-[11px] text-muted-foreground">
            {JSON.stringify(mcpOverview?.tools ?? [], null, 2)}
          </pre>
        </Panel>

        <Panel>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Activity className="h-4 w-4 text-[var(--amber)]" />
            Recent MCP calls
          </div>
          <pre className="mt-4 max-h-[360px] overflow-auto rounded-lg border border-border/60 bg-black/20 p-3 text-[11px] text-muted-foreground">
            {JSON.stringify(mcpOverview?.recentCalls ?? [], null, 2)}
          </pre>
        </Panel>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ClipboardList className="h-4 w-4 text-[var(--emerald)]" />
            Registered tools
          </div>
          <div className="mt-4 space-y-2">
            {tools.map((tool) => (
              <div
                key={tool.id}
                className="rounded-lg border border-border/60 bg-white/[0.03] p-3 text-xs"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-foreground">{tool.id}</span>
                  <StatBadge tone="info">{tool.category}</StatBadge>
                </div>
                <div className="mt-1 font-medium">{tool.name}</div>
                <div className="mt-1 text-muted-foreground">{tool.description}</div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Activity className="h-4 w-4 text-[var(--cyan)]" />
            Recent tool executions
          </div>
          <pre className="mt-4 max-h-[360px] overflow-auto rounded-lg border border-border/60 bg-black/20 p-3 text-[11px] text-muted-foreground">
            {JSON.stringify(toolExecutions.slice(0, 8), null, 2)}
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
