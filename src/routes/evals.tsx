import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  FileText,
  FlaskConical,
  Gauge,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PageHeader, Panel, StatBadge, StatusBadge, StatusDot } from "@/components/ui/page";
import { getEvals, type ApiEvalCheck, type ApiEvalReport } from "@/lib/api/client";
import { useDemo } from "@/lib/demo-context";

export const Route = createFileRoute("/evals")({
  head: () => ({
    meta: [
      { title: "Evals — OmniAgents" },
      {
        name: "description",
        content:
          "Enterprise evaluation command center for AI agent quality, safety, regression tests, model routing and release gates.",
      },
    ],
  }),
  component: EvalsPage,
});

const modelComparison = [
  { model: "gpt-5-mini", quality: 94, latency: 42, cost: 31 },
  { model: "gpt-5", quality: 98, latency: 58, cost: 72 },
  { model: "claude-sonnet", quality: 96, latency: 48, cost: 54 },
  { model: "gemini-pro", quality: 91, latency: 36, cost: 28 },
];

const releaseGates = [
  "Quality score >= 90",
  "No high severity risk",
  "Trace evidence complete",
  "Tool calls validated",
  "Human approval when required",
];

function EvalsPage() {
  const demo = useDemo();
  const scenario = demo.selectedScenario;
  const [reports, setReports] = useState<ApiEvalReport[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let active = true;
    getEvals()
      .then((nextReports) => {
        if (!active) return;
        setReports(nextReports);
        setSelectedRunId((current) => current ?? nextReports[0]?.runId ?? null);
        setLoadState("ready");
      })
      .catch(() => {
        if (!active) return;
        setReports([]);
        setLoadState("error");
      });
    return () => {
      active = false;
    };
  }, [demo.lastCompletedId]);

  const selectedReport = reports.find((report) => report.runId === selectedRunId) ?? reports[0];
  const checks = selectedReport?.checks ?? [];
  const completedSuites = checks.filter((check) => check.status === "passed").length;
  const totalFailures = checks.filter((check) => check.status === "failed").length;
  const averageScore = selectedReport?.overallScore ?? 0;
  const guardrails = checks.filter((check) =>
    ["safety", "tooling", "approval", "cost"].includes(check.category),
  );
  const riskSlices = buildRiskSlices(checks);
  const qualityTrend = buildQualityTrend(reports);
  const releaseDecisionLabel = selectedReport
    ? selectedReport.releaseDecision === "approved"
      ? "Approved for release"
      : selectedReport.releaseDecision === "blocked"
        ? "Blocked pending remediation"
        : "Needs reviewer attention"
    : "No eval report yet";
  const checkTableRows = checks.length
    ? checks
    : [
        {
          id: "empty",
          reportId: "empty",
          runId: "empty",
          category: "traceability",
          name: "Run a workflow to generate evals",
          status: "warning",
          score: 0,
          severity: "medium",
          evidence:
            loadState === "loading"
              ? "Loading persisted eval reports from the backend."
              : "No completed backend run has produced an eval report yet.",
          source: "eval_reports",
          createdAt: "1970-01-01T00:00:00.000Z",
        } satisfies ApiEvalCheck,
      ];

  const reportsBadge =
    loadState === "loading"
      ? "Loading evals"
      : loadState === "error"
        ? "Eval API unavailable"
        : `${reports.length} persisted report${reports.length === 1 ? "" : "s"}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Evals"
        description="Evaluate agent quality, safety, regression risk, model routing and release readiness before autonomous work reaches users."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatBadge tone="success">Backend evals active</StatBadge>
            <StatBadge tone={loadState === "error" ? "warn" : "info"}>{reportsBadge}</StatBadge>
            <StatBadge tone="info">{selectedReport?.workflow ?? scenario.title}</StatBadge>
          </div>
        }
      />

      {reports.length > 0 && (
        <Panel>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-sm font-semibold">Persisted run evals</div>
              <p className="mt-1 text-xs text-muted-foreground">
                These reports are generated from completed backend runs, trace events, artifacts,
                approvals, and tool execution logs.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {reports.slice(0, 8).map((report) => (
                <button
                  key={report.id}
                  onClick={() => setSelectedRunId(report.runId)}
                  className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                    selectedReport?.runId === report.runId
                      ? "border-[var(--electric)] bg-[var(--electric)]/10 text-[var(--electric)]"
                      : "border-border/60 bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
                  }`}
                >
                  {report.runId.slice(0, 18)}
                </button>
              ))}
            </div>
          </div>
        </Panel>
      )}

      <Panel className="relative overflow-hidden p-0">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,oklch(0.72_0.2_250/0.12),transparent_45%,oklch(0.82_0.16_210/0.12))]" />
        <div className="relative grid gap-6 p-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatBadge tone="success">
                <ShieldCheck className="h-3 w-3" />
                Release gate ready
              </StatBadge>
              <StatBadge tone="warn">
                <LockKeyhole className="h-3 w-3" />
                Human review enabled
              </StatBadge>
            </div>
            <h2 className="mt-5 max-w-4xl text-2xl font-semibold tracking-tight sm:text-3xl">
              Quality control for multi-agent AI before it becomes business-critical.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              {selectedReport?.summary ??
                "Evals turn agent behavior into measurable evidence: test suites, regression checks, policy gates, model comparisons, trace review, and final artifact acceptance criteria."}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              {releaseGates.map((gate) => (
                <div
                  key={gate}
                  className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-white/[0.04] px-3 py-2 text-xs"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-[var(--emerald)]" />
                  {gate}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Metric label="Quality score" value={`${averageScore}%`} tone="success" />
            <Metric label="Checks passed" value={`${completedSuites}/${checks.length || 0}`} />
            <Metric label="Safety score" value={`${selectedReport?.safetyScore ?? 0}%`} />
            <Metric label="Open failures" value={String(totalFailures)} tone="warn" />
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <SectionTitle
            icon={<FlaskConical className="h-4 w-4" />}
            title="Evaluation checks"
            subtitle="Persisted checks generated from run steps, traces, tools, approvals, cost and artifact data."
          />
          <div className="mt-4 overflow-x-auto rounded-xl border border-border/60">
            <table className="min-w-[820px] w-full text-left text-xs">
              <thead className="bg-white/[0.035] text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                <tr>
                  <th className="px-3 py-3 font-medium">Check</th>
                  <th className="px-3 py-3 font-medium">Category</th>
                  <th className="px-3 py-3 font-medium">Evidence</th>
                  <th className="px-3 py-3 font-medium">Source</th>
                  <th className="px-3 py-3 font-medium">Score</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {checkTableRows.map((check) => (
                  <tr key={check.id} className="border-t border-border/60">
                    <td className="px-3 py-3 font-semibold">{check.name}</td>
                    <td className="px-3 py-3 text-muted-foreground">{check.category}</td>
                    <td className="max-w-[280px] px-3 py-3 text-muted-foreground">
                      {check.evidence}
                    </td>
                    <td className="px-3 py-3 font-mono text-muted-foreground">{check.source}</td>
                    <td className="px-3 py-3">
                      <ScoreBar value={check.score} />
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={check.status} label={check.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel>
          <SectionTitle
            icon={<Target className="h-4 w-4" />}
            title="Release decision"
            subtitle="Generated gate for whether this run can be shipped, shown, or held."
          />
          <div className="mt-5 rounded-xl border border-[var(--emerald)]/25 bg-[var(--emerald)]/10 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--emerald)]">
              <CheckCircle2 className="h-4 w-4" />
              {releaseDecisionLabel}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {selectedReport
                ? `Report ${selectedReport.id} was generated from run ${selectedReport.runId}. Overall score ${selectedReport.overallScore}%.`
                : "Complete a backend workflow run to generate a persisted eval report."}
            </p>
          </div>
          <div className="mt-4 space-y-3">
            {guardrails.map((guardrail) => (
              <div key={guardrail.id} className="rounded-xl border border-border/60 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold">{guardrail.name}</div>
                  <StatusDot status={guardrail.status} />
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {guardrail.evidence}
                </p>
              </div>
            ))}
            {!guardrails.length && (
              <div className="rounded-xl border border-border/60 p-3 text-xs text-muted-foreground">
                No guardrail checks are available yet.
              </div>
            )}
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <SectionTitle
            icon={<Gauge className="h-4 w-4" />}
            title="Quality trend"
            subtitle="Persisted eval reports over time across quality, safety, and cost discipline."
          />
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={qualityTrend}>
                <CartesianGrid stroke="oklch(1 0 0 / 0.07)" vertical={false} />
                <XAxis dataKey="date" stroke="oklch(0.7 0.02 260)" fontSize={11} />
                <YAxis stroke="oklch(0.7 0.02 260)" fontSize={11} domain={[70, 100]} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="quality"
                  stroke="oklch(0.72 0.2 250)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="safety"
                  stroke="oklch(0.78 0.17 165)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="cost"
                  stroke="oklch(0.82 0.17 75)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel>
          <SectionTitle
            icon={<ShieldCheck className="h-4 w-4" />}
            title="Risk disposition"
            subtitle="How persisted eval checks are classified before release."
          />
          <div className="mt-3 h-60">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={riskSlices} dataKey="value" innerRadius={58} outerRadius={86}>
                  {riskSlices.map((slice) => (
                    <Cell key={slice.name} fill={slice.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {riskSlices.map((slice) => (
              <div key={slice.name} className="flex items-center gap-2 text-xs">
                <span className="h-2 w-2 rounded-full" style={{ background: slice.color }} />
                <span className="text-muted-foreground">{slice.name}</span>
                <span className="ml-auto font-semibold">{slice.value}%</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel>
          <SectionTitle
            icon={<Brain className="h-4 w-4" />}
            title="Model comparison"
            subtitle="Quality, latency, and cost normalized for routing decisions."
          />
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={modelComparison}>
                <CartesianGrid stroke="oklch(1 0 0 / 0.07)" vertical={false} />
                <XAxis dataKey="model" stroke="oklch(0.7 0.02 260)" fontSize={10} />
                <YAxis stroke="oklch(0.7 0.02 260)" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="quality" fill="oklch(0.72 0.2 250)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="cost" fill="oklch(0.82 0.17 75)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel>
          <SectionTitle
            icon={<FileText className="h-4 w-4" />}
            title="Trace-backed evidence"
            subtitle="What the eval system proves from the latest demo workflow."
          />
          <div className="mt-4 space-y-3">
            {checks.slice(0, 6).map((row) => (
              <div key={row.id} className="rounded-xl border border-border/60 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">{row.name}</div>
                    <div className="mt-1 font-mono text-[11px] text-[var(--cyan)]">
                      {row.source}
                    </div>
                  </div>
                  <StatBadge tone={row.score >= 95 ? "success" : "info"}>{row.score}%</StatBadge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{row.evidence}</p>
              </div>
            ))}
            {!checks.length && (
              <div className="rounded-xl border border-border/60 p-3 text-xs text-muted-foreground">
                No trace-backed eval evidence yet. Run and complete a workflow to generate it.
              </div>
            )}
          </div>
        </Panel>
      </div>

      <Panel>
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-[var(--amber)]" />
              Why this matters in enterprise demos
            </div>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">
              The impressive part is not only that agents can run. It is that every run can be
              tested, scored, compared, traced, persisted, and gated before clients trust it with
              real work. This page now reads from backend eval reports generated from completed
              workflow runs.
            </p>
          </div>
          <Link
            to="/debugger"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border/60 bg-white/[0.04] px-4 text-sm font-medium transition hover:-translate-y-px hover:bg-white/[0.08] focus-visible:ring-2 focus-visible:ring-[var(--ring)]/55"
          >
            View trace evidence
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Panel>
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

function ScoreBar({ value }: { value: number }) {
  return (
    <div className="min-w-[120px]">
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--electric)] to-[var(--cyan)]"
            style={{ width: `${value}%` }}
          />
        </div>
        <span className="w-8 text-right font-mono text-[11px] text-muted-foreground">{value}</span>
      </div>
    </div>
  );
}

function buildRiskSlices(checks: ApiEvalCheck[]) {
  const passed = checks.filter((check) => check.status === "passed").length;
  const warning = checks.filter((check) => check.status === "warning").length;
  const failed = checks.filter((check) => check.status === "failed").length;
  const total = Math.max(checks.length, 1);

  return [
    {
      name: "Passed",
      value: Math.round((passed / total) * 100),
      color: "oklch(0.78 0.17 165)",
    },
    {
      name: "Needs review",
      value: Math.round((warning / total) * 100),
      color: "oklch(0.82 0.17 75)",
    },
    {
      name: "Blocked",
      value: Math.round((failed / total) * 100),
      color: "oklch(0.65 0.22 25)",
    },
  ];
}

function buildQualityTrend(reports: ApiEvalReport[]) {
  return reports
    .slice(0, 8)
    .reverse()
    .map((report) => ({
      date: new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
      }).format(new Date(report.generatedAt)),
      quality: report.qualityScore,
      safety: report.safetyScore,
      cost: report.costScore,
    }));
}

const tooltipStyle = {
  background: "oklch(0.18 0.03 264)",
  border: "1px solid oklch(1 0 0 / 0.1)",
  borderRadius: 10,
  color: "oklch(0.96 0.01 260)",
  fontSize: 12,
};
