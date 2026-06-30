import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, Eye, Globe2, LockKeyhole, MonitorSmartphone, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { PageHeader, Panel, StatBadge } from "@/components/ui/page";
import {
  getAdminAnalytics,
  getAdminAnalyticsToken,
  saveAdminAnalyticsToken,
  type ApiAdminAnalytics,
  type ApiAdminVisit,
} from "@/lib/api/client";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({ meta: [{ title: "Admin Analytics — OmniAgents" }] }),
  component: AdminAnalyticsPage,
});

function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<ApiAdminAnalytics | null>(null);
  const [adminToken, setAdminToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token") ?? params.get("admin_token");
    const storedToken = getAdminAnalyticsToken();
    const nextToken = urlToken ?? storedToken;
    if (nextToken) {
      saveAdminAnalyticsToken(nextToken);
      setAdminToken(nextToken);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function loadAnalytics() {
      try {
        setLoading(true);
        const nextAnalytics = await getAdminAnalytics();
        if (!active) return;
        setAnalytics(nextAnalytics);
        setError(null);
      } catch (apiError) {
        if (!active) return;
        setError(
          apiError instanceof Error ? apiError.message : "Admin analytics could not be loaded.",
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadAnalytics();
    const interval = window.setInterval(loadAnalytics, 15000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [adminToken]);

  const summary = analytics?.summary;
  const recentVisits = analytics?.visits ?? [];
  const latestVisit = recentVisits[0] ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Analytics"
        description="Private owner view for anonymous site visits, device mix, pages, referrers, and coarse Vercel location signals."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatBadge tone="warn">
              <LockKeyhole className="h-3 w-3" />
              Protected
            </StatBadge>
            <StatBadge tone={analytics ? "success" : "default"}>
              {analytics ? "Tracking active" : "Waiting"}
            </StatBadge>
          </div>
        }
      />

      <Panel>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold">Owner access</div>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">
              Open this page with `/admin/analytics?token=...` or enter the token below. This view
              is intentionally hidden from the sidebar and API calls require
              `ADMIN_ANALYTICS_TOKEN`.
            </p>
          </div>
          <form
            className="flex w-full gap-2 md:w-auto"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              const token = String(formData.get("adminToken") ?? "").trim();
              if (!token) return;
              saveAdminAnalyticsToken(token);
              setAdminToken(token);
            }}
          >
            <input
              name="adminToken"
              type="password"
              aria-label="Admin analytics token"
              placeholder="Admin token"
              className="h-9 min-w-0 rounded-md border border-border/70 bg-background px-3 text-xs text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/25 md:w-56"
            />
            <button
              type="submit"
              className="h-9 rounded-md border border-border/70 bg-white/[0.05] px-3 text-xs font-medium text-foreground transition hover:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              Unlock
            </button>
          </form>
        </div>
      </Panel>

      {error && (
        <Panel className="border-amber-400/30 bg-amber-400/5">
          <div className="text-sm font-semibold text-[var(--amber)]">Protected or unavailable</div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {error}. If this is deployed, set `ADMIN_ANALYTICS_TOKEN` in Vercel and open the page
            with the matching token.
          </p>
        </Panel>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={<Eye className="h-4 w-4" />}
          label="Total visits"
          value={formatNumber(summary?.totalVisits)}
          hint={latestVisit ? `Latest ${formatDateTime(latestVisit.createdAt)}` : "No visits yet"}
        />
        <MetricCard
          icon={<Globe2 className="h-4 w-4" />}
          label="Unique visitors"
          value={formatNumber(summary?.uniqueVisitors)}
          hint="Anonymous visitor hash"
        />
        <MetricCard
          icon={<MonitorSmartphone className="h-4 w-4" />}
          label="Mobile visits"
          value={formatNumber(summary?.mobileVisits)}
          hint={`${formatNumber(summary?.desktopVisits)} desktop`}
        />
        <MetricCard
          icon={<RefreshCw className="h-4 w-4" />}
          label="Bot / preview hits"
          value={formatNumber(summary?.botVisits)}
          hint="Link previews and crawlers"
        />
      </div>

      <Panel>
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-[var(--cyan)]">
            <LockKeyhole className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold">Privacy boundary</div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {analytics?.privacy.note ??
                "Visits are anonymous unless the app later adds login or invite-specific links."}{" "}
              Raw IP addresses are not stored. Location is based on{" "}
              {analytics?.privacy.locationSource ?? "Vercel geo headers when available"}.
            </p>
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <TopList
          title="Top pages"
          icon={<BarChart3 className="h-4 w-4" />}
          items={(summary?.topPages ?? []).map((item) => ({
            label: item.path,
            value: item.visits,
          }))}
          emptyLabel={loading ? "Loading page data..." : "No page visits yet."}
        />
        <TopList
          title="Locations"
          icon={<Globe2 className="h-4 w-4" />}
          items={(summary?.locations ?? []).map((item) => ({
            label: item.label,
            value: item.visits,
          }))}
          emptyLabel={loading ? "Loading locations..." : "Location data unavailable."}
        />
        <TopList
          title="Referrers"
          icon={<Eye className="h-4 w-4" />}
          items={(summary?.topReferrers ?? []).map((item) => ({
            label: item.referrer,
            value: item.visits,
          }))}
          emptyLabel={loading ? "Loading referrers..." : "No referrers captured yet."}
        />
      </div>

      <Panel>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">Recent visits</h2>
            <p className="text-xs text-muted-foreground">
              Last 100 anonymous page visits captured by the server.
            </p>
          </div>
          <StatBadge tone="info">{recentVisits.length} rows</StatBadge>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-border/60">
          <table className="min-w-[920px] w-full text-left text-xs">
            <thead className="bg-white/[0.035] text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <tr>
                <th className="px-3 py-3 font-medium">Time</th>
                <th className="px-3 py-3 font-medium">Page</th>
                <th className="px-3 py-3 font-medium">Device</th>
                <th className="px-3 py-3 font-medium">Location</th>
                <th className="px-3 py-3 font-medium">Referrer</th>
                <th className="px-3 py-3 font-medium">Visitor</th>
              </tr>
            </thead>
            <tbody>
              {recentVisits.map((visit) => (
                <VisitRow key={visit.id} visit={visit} />
              ))}
              {!recentVisits.length && (
                <tr>
                  <td className="px-3 py-8 text-center text-muted-foreground" colSpan={6}>
                    {loading
                      ? "Loading visit history..."
                      : "No visits captured yet. Share the public link and refresh this page."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Panel>
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
        <div className="text-[var(--cyan)]">{icon}</div>
      </div>
      <div className="mt-4 text-3xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
    </Panel>
  );
}

function TopList({
  title,
  icon,
  items,
  emptyLabel,
}: {
  title: string;
  icon: ReactNode;
  items: Array<{ label: string; value: number }>;
  emptyLabel: string;
}) {
  const maxValue = useMemo(() => Math.max(...items.map((item) => item.value), 1), [items]);

  return (
    <Panel>
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span className="text-[var(--cyan)]">{icon}</span>
        {title}
      </div>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item.label}>
            <div className="flex items-center justify-between gap-4 text-xs">
              <span className="min-w-0 truncate text-foreground">{item.label}</span>
              <span className="font-semibold text-muted-foreground">{item.value}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[var(--electric)] to-[var(--cyan)]"
                style={{ width: `${Math.max(8, (item.value / maxValue) * 100)}%` }}
              />
            </div>
          </div>
        ))}
        {!items.length && <div className="text-xs text-muted-foreground">{emptyLabel}</div>}
      </div>
    </Panel>
  );
}

function VisitRow({ visit }: { visit: ApiAdminVisit }) {
  return (
    <tr className="border-t border-border/60 transition hover:bg-white/[0.03]">
      <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">
        {formatDateTime(visit.createdAt)}
      </td>
      <td className="max-w-[220px] truncate px-3 py-3 font-mono text-foreground">{visit.path}</td>
      <td className="px-3 py-3">
        <StatBadge tone={visit.isBot ? "warn" : "info"}>{visit.deviceType}</StatBadge>
      </td>
      <td className="max-w-[190px] truncate px-3 py-3 text-muted-foreground">
        {formatLocation(visit)}
      </td>
      <td className="max-w-[240px] truncate px-3 py-3 text-muted-foreground">
        {visit.referrer ?? "Direct / unknown"}
      </td>
      <td className="px-3 py-3 font-mono text-muted-foreground">{visit.visitorHash.slice(0, 8)}</td>
    </tr>
  );
}

function formatNumber(value: number | undefined) {
  return value === undefined ? "-" : new Intl.NumberFormat().format(value);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatLocation(visit: ApiAdminVisit) {
  const parts = [visit.city, visit.region, visit.country].filter(Boolean);
  return parts.length ? parts.join(", ") : "Unknown";
}
