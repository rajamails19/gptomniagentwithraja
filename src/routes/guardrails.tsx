import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileWarning,
  Gauge,
  LockKeyhole,
  ShieldCheck,
  ShieldAlert,
  SlidersHorizontal,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { PageHeader, Panel, StatBadge, StatusBadge, StatusDot } from "@/components/ui/page";
import {
  getGuardrails,
  type ApiGuardrailOverview,
  type ApiGuardrailPolicy,
  type ApiGuardrailSignal,
} from "@/lib/api/client";

export const Route = createFileRoute("/guardrails")({
  head: () => ({
    meta: [
      { title: "Guardrails — OmniAgents" },
      {
        name: "description",
        content:
          "Enterprise AI guardrails for privacy, prompt injection, tool permissions, cost limits, human review, and release controls.",
      },
    ],
  }),
  component: GuardrailsPage,
});

function GuardrailsPage() {
  const [overview, setOverview] = useState<ApiGuardrailOverview | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let active = true;
    getGuardrails()
      .then((data) => {
        if (!active) return;
        setOverview(data);
        setLoadState("ready");
      })
      .catch(() => {
        if (!active) return;
        setLoadState("error");
      });
    return () => {
      active = false;
    };
  }, []);

  const policies = overview?.policies ?? [];
  const signals = overview?.signals ?? [];
  const summary = overview?.summary;
  const posture = summary?.riskPosture ?? "controlled";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Guardrails"
        description="Define and monitor the controls that keep autonomous agent workflows inside approved privacy, safety, cost, tool, and human-review boundaries."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatBadge tone={loadState === "error" ? "warn" : "success"}>
              {loadState === "loading"
                ? "Loading controls"
                : loadState === "error"
                  ? "Guardrail API unavailable"
                  : "Backend policies active"}
            </StatBadge>
            <StatBadge tone={posture === "blocked" ? "warn" : "info"}>
              {posture === "controlled"
                ? "Controlled posture"
                : posture === "watch"
                  ? "Watch posture"
                  : "Blocked posture"}
            </StatBadge>
          </div>
        }
      />

      <Panel className="relative overflow-hidden p-0">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,oklch(0.82_0.17_75/0.12),transparent_48%,oklch(0.72_0.2_250/0.12))]" />
        <div className="relative grid gap-6 p-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatBadge tone="success">
                <ShieldCheck className="h-3 w-3" />
                Policy-driven execution
              </StatBadge>
              <StatBadge tone="warn">
                <LockKeyhole className="h-3 w-3" />
                Block before damage
              </StatBadge>
            </div>
            <h2 className="mt-5 max-w-4xl text-2xl font-semibold tracking-tight sm:text-3xl">
              Guardrails are the operating rules agents must obey before work reaches production.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              This page shows the product control layer: what is blocked, what is warned, which
              evidence is monitored, and where human approval is required. Evals score outcomes;
              guardrails enforce boundaries.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Metric label="Policies" value={String(summary?.totalPolicies ?? 0)} />
            <Metric label="Active" value={String(summary?.activePolicies ?? 0)} tone="success" />
            <Metric label="Blocking" value={String(summary?.blockingPolicies ?? 0)} tone="warn" />
            <Metric label="Warnings" value={String(summary?.warningPolicies ?? 0)} tone="warn" />
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <SectionTitle
            icon={<SlidersHorizontal className="h-4 w-4" />}
            title="Policy controls"
            subtitle="Persisted guardrail definitions that can later become editable, org-scoped, and enforced per project."
          />
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {policies.map((policy) => (
              <PolicyCard key={policy.id} policy={policy} />
            ))}
            {!policies.length && <EmptyPanel message="No guardrail policies loaded yet." />}
          </div>
        </Panel>

        <Panel>
          <SectionTitle
            icon={<Gauge className="h-4 w-4" />}
            title="Enforcement posture"
            subtitle="Current control posture based on policies and recent eval signals."
          />
          <div className="mt-4 rounded-xl border border-border/60 bg-white/[0.035] p-4">
            <div className="flex items-center gap-3">
              {posture === "controlled" ? (
                <CheckCircle2 className="h-5 w-5 text-[var(--emerald)]" />
              ) : posture === "watch" ? (
                <AlertTriangle className="h-5 w-5 text-[var(--amber)]" />
              ) : (
                <ShieldAlert className="h-5 w-5 text-destructive" />
              )}
              <div>
                <div className="text-sm font-semibold capitalize">{posture} posture</div>
                <div className="text-xs text-muted-foreground">
                  {summary?.latestSignalAt
                    ? `Latest evidence ${formatShortDate(summary.latestSignalAt)}`
                    : "Waiting for eval evidence"}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <PostureRow label="Privacy controls" value="PII redaction" status="passed" />
            <PostureRow label="Security controls" value="Injection defense" status="passed" />
            <PostureRow label="Tool controls" value="Role allow-list" status="passed" />
            <PostureRow label="Cost controls" value="Budget monitor" status="warning" />
            <PostureRow label="Review controls" value="Approval gate" status="passed" />
          </div>
        </Panel>
      </div>

      <Panel>
        <SectionTitle
          icon={<FileWarning className="h-4 w-4" />}
          title="Recent guardrail signals"
          subtitle="Evidence derived from persisted eval checks, approvals, traces, and tool execution logs."
        />
        <div className="mt-4 overflow-x-auto rounded-xl border border-border/60">
          <table className="min-w-[760px] w-full text-left text-xs">
            <thead className="bg-white/[0.035] text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <tr>
                <th className="px-3 py-3 font-medium">Policy</th>
                <th className="px-3 py-3 font-medium">Run</th>
                <th className="px-3 py-3 font-medium">Evidence</th>
                <th className="px-3 py-3 font-medium">Source</th>
                <th className="px-3 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {signals.slice(0, 10).map((signal) => (
                <SignalRow
                  key={signal.id}
                  signal={signal}
                  policy={policies.find((policy) => policy.id === signal.policyId)}
                />
              ))}
              {!signals.length && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                    Run a workflow and generate evals to produce guardrail signals.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel>
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="h-4 w-4 text-[var(--cyan)]" />
              Product direction
            </div>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">
              The next maturity step is enforcement hooks inside the orchestrator: pre-prompt
              checks, pre-tool checks, approval gates, cost ceilings, and post-artifact release
              gates. This page establishes the backend contract and operator view.
            </p>
          </div>
          <Link
            to="/evals"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border/60 bg-white/[0.04] px-4 text-sm font-medium transition hover:-translate-y-px hover:bg-white/[0.08] focus-visible:ring-2 focus-visible:ring-[var(--ring)]/55"
          >
            View eval evidence
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Panel>
    </div>
  );
}

function PolicyCard({ policy }: { policy: ApiGuardrailPolicy }) {
  const modeTone = policy.mode === "block" ? "warn" : policy.mode === "warn" ? "info" : "success";

  return (
    <div className="rounded-xl border border-border/60 bg-white/[0.035] p-4 transition hover:border-white/15 hover:bg-white/[0.055]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{policy.name}</div>
          <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            {policy.category.replace("_", " ")}
          </div>
        </div>
        <StatusDot status={policy.status === "disabled" ? "failed" : "passed"} />
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{policy.description}</p>
      <div className="mt-4 grid gap-2 text-xs">
        <PolicyMeta label="Trigger" value={policy.trigger} />
        <PolicyMeta label="Action" value={policy.action} />
        <PolicyMeta label="Scope" value={policy.scope} />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <StatBadge tone={modeTone}>{policy.mode}</StatBadge>
        <StatBadge tone={policy.status === "disabled" ? "warn" : "success"}>
          {policy.status}
        </StatBadge>
        <StatBadge tone="info">{policy.passRate}% pass</StatBadge>
      </div>
    </div>
  );
}

function SignalRow({
  signal,
  policy,
}: {
  signal: ApiGuardrailSignal;
  policy?: ApiGuardrailPolicy;
}) {
  return (
    <tr className="border-t border-border/60">
      <td className="px-3 py-3">
        <div className="font-semibold">{policy?.name ?? signal.policyId}</div>
        <div className="mt-1 text-[11px] text-muted-foreground">
          {policy?.category.replace("_", " ") ?? "policy"}
        </div>
      </td>
      <td className="px-3 py-3 font-mono text-muted-foreground">{signal.runId}</td>
      <td className="max-w-[360px] px-3 py-3 text-muted-foreground">{signal.evidence}</td>
      <td className="px-3 py-3 font-mono text-muted-foreground">{signal.source}</td>
      <td className="px-3 py-3">
        <StatusBadge status={signal.status} label={signal.status} />
      </td>
    </tr>
  );
}

function PolicyMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/50 bg-black/10 p-2">
      <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div className="mt-1 leading-relaxed">{value}</div>
    </div>
  );
}

function PostureRow({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status: "passed" | "warning" | "failed";
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 p-3">
      <div>
        <div className="text-sm font-semibold">{label}</div>
        <div className="text-xs text-muted-foreground">{value}</div>
      </div>
      <StatusDot status={status} />
    </div>
  );
}

function Metric({
  label,
  value,
  tone = "info",
}: {
  label: string;
  value: string;
  tone?: "success" | "warn" | "info";
}) {
  const toneClass =
    tone === "success"
      ? "text-[var(--emerald)]"
      : tone === "warn"
        ? "text-[var(--amber)]"
        : "text-[var(--cyan)]";

  return (
    <div className="rounded-xl border border-border/60 bg-white/[0.04] p-4">
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className={`mt-3 text-3xl font-semibold tracking-tight ${toneClass}`}>{value}</div>
    </div>
  );
}

function SectionTitle({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className="text-[var(--cyan)]">{icon}</span>
          {title}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function EmptyPanel({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-border/60 p-4 text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
