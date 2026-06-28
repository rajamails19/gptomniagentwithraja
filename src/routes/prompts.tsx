import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  GitCompare,
  Play,
  Clock,
  User,
  TrendingUp,
  ChevronRight,
  History,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader, Panel, StatBadge } from "@/components/ui/page";
import { prompts, type Prompt, type PromptVersion } from "@/lib/mock-data";
import { toast } from "sonner";

export const Route = createFileRoute("/prompts")({
  head: () => ({
    meta: [
      { title: "Prompt Library — OmniAgents" },
      {
        name: "description",
        content: "Manage, test, and version prompts across agents, tools and safety policies.",
      },
    ],
  }),
  component: PromptsPage,
});

// ─── Line-level diff engine ──────────────────────────────────────────────────

type DiffLineType = "same" | "added" | "removed";
type DiffLine = { type: DiffLineType; text: string };

function diffLines(oldText: string, newText: string): DiffLine[] {
  const a = oldText.split("\n");
  const b = newText.split("\n");
  const m = a.length;
  const n = b.length;

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const result: DiffLine[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      result.unshift({ type: "same", text: a[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: "added", text: b[j - 1] });
      j--;
    } else {
      result.unshift({ type: "removed", text: a[i - 1] });
      i--;
    }
  }
  return result;
}

function scoreDelta(a: number, b: number): string | null {
  const d = b - a;
  if (d === 0) return null;
  return d > 0 ? `+${d}%` : `${d}%`;
}

// ─── Sidebar list item ───────────────────────────────────────────────────────

function PromptListItem({
  prompt,
  selected,
  onClick,
}: {
  prompt: Prompt;
  selected: boolean;
  onClick: () => void;
}) {
  const latest = prompt.versions[prompt.versions.length - 1];
  const first = prompt.versions[0];
  const gain = latest.score - first.score;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 hover:bg-white/[0.04] transition-colors ${selected ? "bg-white/[0.07]" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-medium truncate">{prompt.name}</div>
        <StatBadge tone="info">{latest.version}</StatBadge>
      </div>
      <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>
          {prompt.category} · {prompt.runs.toLocaleString()} runs
        </span>
        <span className="flex items-center gap-1">
          <History className="h-2.5 w-2.5" />
          {prompt.versions.length}v
        </span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[var(--electric)] to-[var(--violet)]"
            style={{ width: `${latest.score}%` }}
          />
        </div>
        <span className="text-[10px] tabular-nums text-muted-foreground">{latest.score}%</span>
        {gain > 0 && <span className="text-[10px] text-[var(--emerald)]">+{gain}%</span>}
      </div>
    </button>
  );
}

// ─── Version picker tabs ─────────────────────────────────────────────────────

function VersionTabs({
  versions,
  selected,
  onChange,
}: {
  versions: PromptVersion[];
  selected: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {versions.map((v, i) => {
        const isLatest = i === versions.length - 1;
        const active = v.version === selected;
        return (
          <button
            key={v.version}
            onClick={() => onChange(v.version)}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium transition-all border ${
              active
                ? "bg-[var(--electric)]/15 border-[var(--electric)]/50 text-[var(--electric)]"
                : "bg-white/[0.03] border-border/50 text-muted-foreground hover:text-foreground hover:bg-white/[0.06]"
            }`}
          >
            {v.version}
            {isLatest && (
              <span className="ml-0.5 rounded-full bg-[var(--emerald)]/20 px-1 text-[9px] text-[var(--emerald)]">
                latest
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Score sparkline ─────────────────────────────────────────────────────────

function ScoreSparkline({ versions }: { versions: PromptVersion[] }) {
  const max = 100;
  const minScore = Math.min(...versions.map((v) => v.score)) - 5;
  const w = 80;
  const h = 28;
  const pts = versions.map((v, i) => {
    const x = (i / Math.max(versions.length - 1, 1)) * w;
    const y = h - ((v.score - minScore) / (max - minScore)) * h;
    return `${x},${y}`;
  });

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke="oklch(0.72 0.2 250)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {versions.map((v, i) => {
        const x = (i / Math.max(versions.length - 1, 1)) * w;
        const y = h - ((v.score - minScore) / (max - minScore)) * h;
        return (
          <circle
            key={v.version}
            cx={x}
            cy={y}
            r="2.5"
            fill={i === versions.length - 1 ? "oklch(0.78 0.17 165)" : "oklch(0.72 0.2 250)"}
          />
        );
      })}
    </svg>
  );
}

// ─── Diff modal ──────────────────────────────────────────────────────────────

function DiffModal({
  open,
  onClose,
  prompt,
}: {
  open: boolean;
  onClose: () => void;
  prompt: Prompt;
}) {
  const { versions } = prompt;
  const [fromVer, setFromVer] = useState(
    versions[versions.length - 2]?.version ?? versions[0].version,
  );
  const [toVer, setToVer] = useState(versions[versions.length - 1].version);

  const fromVersion = versions.find((v) => v.version === fromVer)!;
  const toVersion = versions.find((v) => v.version === toVer)!;

  const diff = useMemo(
    () => diffLines(fromVersion.body, toVersion.body),
    [fromVersion.body, toVersion.body],
  );

  const added = diff.filter((l) => l.type === "added").length;
  const removed = diff.filter((l) => l.type === "removed").length;
  const delta = scoreDelta(fromVersion.score, toVersion.score);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/60 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <GitCompare className="h-4 w-4 text-[var(--electric)]" />
            Version diff — {prompt.name}
          </DialogTitle>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                From
              </span>
              <select
                value={fromVer}
                onChange={(e) => setFromVer(e.target.value)}
                className="rounded-md border border-border/60 bg-black/30 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--electric)]"
              >
                {versions.map((v) => (
                  <option key={v.version} value={v.version}>
                    {v.version} · {v.date}
                  </option>
                ))}
              </select>
            </div>

            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />

            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">To</span>
              <select
                value={toVer}
                onChange={(e) => setToVer(e.target.value)}
                className="rounded-md border border-border/60 bg-black/30 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--electric)]"
              >
                {versions.map((v) => (
                  <option key={v.version} value={v.version}>
                    {v.version} · {v.date}
                  </option>
                ))}
              </select>
            </div>

            <div className="ml-auto flex items-center gap-2 flex-wrap">
              {added > 0 && (
                <span className="rounded-full bg-[oklch(0.78_0.17_165/0.15)] border border-[oklch(0.78_0.17_165/0.3)] px-2 py-0.5 text-[11px] text-[var(--emerald)]">
                  +{added} lines
                </span>
              )}
              {removed > 0 && (
                <span className="rounded-full bg-[oklch(0.65_0.22_25/0.15)] border border-[oklch(0.65_0.22_25/0.3)] px-2 py-0.5 text-[11px] text-[var(--destructive)]">
                  −{removed} lines
                </span>
              )}
              {delta && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] border ${
                    delta.startsWith("+")
                      ? "bg-[oklch(0.78_0.17_165/0.1)] border-[oklch(0.78_0.17_165/0.3)] text-[var(--emerald)]"
                      : "bg-[oklch(0.65_0.22_25/0.1)] border-[oklch(0.65_0.22_25/0.3)] text-[var(--destructive)]"
                  }`}
                >
                  score {delta}
                </span>
              )}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-[oklch(0.65_0.22_25/0.06)] border border-[oklch(0.65_0.22_25/0.18)] px-3 py-2">
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5">
                {fromVersion.version}
              </div>
              <div className="text-[11px] text-muted-foreground">{fromVersion.changelog}</div>
            </div>
            <div className="rounded-lg bg-[oklch(0.78_0.17_165/0.06)] border border-[oklch(0.78_0.17_165/0.18)] px-3 py-2">
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5">
                {toVersion.version}
              </div>
              <div className="text-[11px] text-muted-foreground">{toVersion.changelog}</div>
            </div>
          </div>
        </DialogHeader>

        <div className="overflow-auto flex-1">
          <div className="grid grid-cols-[auto_1fr] min-w-0">
            {diff.map((line, idx) => {
              const bg =
                line.type === "added"
                  ? "bg-[oklch(0.78_0.17_165/0.10)]"
                  : line.type === "removed"
                    ? "bg-[oklch(0.65_0.22_25/0.10)]"
                    : "";
              const gutter =
                line.type === "added"
                  ? "text-[var(--emerald)] bg-[oklch(0.78_0.17_165/0.15)]"
                  : line.type === "removed"
                    ? "text-[var(--destructive)] bg-[oklch(0.65_0.22_25/0.15)]"
                    : "text-muted-foreground/30";
              const sign = line.type === "added" ? "+" : line.type === "removed" ? "−" : " ";
              const textColor =
                line.type === "added"
                  ? "text-[var(--emerald)]"
                  : line.type === "removed"
                    ? "text-[var(--destructive)]/80"
                    : "text-muted-foreground";

              return (
                <div key={idx} className="contents">
                  <div
                    className={`px-3 py-0.5 text-[11px] font-mono font-bold border-r border-border/30 select-none ${gutter}`}
                  >
                    {sign}
                  </div>
                  <div
                    className={`px-4 py-0.5 text-[11px] font-mono whitespace-pre-wrap break-all ${bg} ${textColor}`}
                  >
                    {line.text === "" ? " " : line.text}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

function PromptsPage() {
  const [selectedId, setSelectedId] = useState(prompts[0].id);
  const [diffOpen, setDiffOpen] = useState(false);
  const [selectedVer, setSelectedVer] = useState(
    prompts[0].versions[prompts[0].versions.length - 1].version,
  );

  function selectPrompt(id: string) {
    const p = prompts.find((x) => x.id === id)!;
    setSelectedId(id);
    setSelectedVer(p.versions[p.versions.length - 1].version);
  }

  const prompt = prompts.find((p) => p.id === selectedId)!;
  const latestVer = prompt.versions[prompt.versions.length - 1].version;
  const version = prompt.versions.find((v) => v.version === selectedVer)!;
  const prevVersion = prompt.versions[prompt.versions.indexOf(version) - 1];
  const isLatest = selectedVer === latestVer;
  const delta = prevVersion ? scoreDelta(prevVersion.score, version.score) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prompt Library"
        description="Production-grade prompt ops: versioning, testing, and performance scoring."
      />

      <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-4">
        {/* Left: prompt list */}
        <Panel className="p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between">
            <span className="text-sm font-semibold">All prompts</span>
            <span className="text-[11px] text-muted-foreground">{prompts.length} prompts</span>
          </div>
          <div className="divide-y divide-border/60">
            {prompts.map((p) => (
              <PromptListItem
                key={p.id}
                prompt={p}
                selected={selectedId === p.id}
                onClick={() => selectPrompt(p.id)}
              />
            ))}
          </div>
        </Panel>

        {/* Right: detail panel */}
        <Panel className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="text-base font-semibold truncate">{prompt.name}</div>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                <span>{prompt.category}</span>
                <span>·</span>
                <span>{prompt.runs.toLocaleString()} runs</span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <History className="h-3 w-3" />
                  {prompt.versions.length} versions
                </span>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDiffOpen(true)}
                disabled={prompt.versions.length < 2}
              >
                <GitCompare className="h-3.5 w-3.5 mr-1.5" /> Compare versions
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  toast.success("Test run queued", {
                    description: `${prompt.name} · ${version.version}`,
                  })
                }
                className="bg-gradient-to-r from-[var(--electric)] to-[var(--violet)] text-white border-0"
              >
                <Play className="h-3.5 w-3.5 mr-1.5" /> Test
              </Button>
            </div>
          </div>

          {/* Sparkline + version tabs */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="space-y-1">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Score history
              </div>
              <div className="flex items-end gap-3">
                <ScoreSparkline versions={prompt.versions} />
                <div className="flex flex-col justify-end">
                  <span className="text-lg font-bold tabular-nums leading-none">
                    {version.score}%
                  </span>
                  {delta && (
                    <span
                      className={`text-[11px] mt-0.5 ${delta.startsWith("+") ? "text-[var(--emerald)]" : "text-[var(--destructive)]"}`}
                    >
                      {delta} vs {prevVersion.version}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Version
              </div>
              <VersionTabs
                versions={prompt.versions}
                selected={selectedVer}
                onChange={setSelectedVer}
              />
            </div>
          </div>

          {/* Changelog */}
          <div className="rounded-lg border border-border/50 bg-white/[0.025] px-4 py-3 space-y-1.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-[var(--amber)]" />
                <span className="text-xs font-semibold">{version.version} changelog</span>
                {isLatest && <StatBadge tone="success">latest</StatBadge>}
              </div>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {version.date}
                </span>
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {version.author}
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{version.changelog}</p>
          </div>

          {/* Prompt body */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Prompt body · {version.version}
              </span>
              {!isLatest && (
                <span className="text-[10px] text-[var(--amber)] border border-[var(--amber)]/30 rounded px-1.5 py-0.5">
                  viewing older version
                </span>
              )}
            </div>
            <textarea
              key={`${prompt.id}-${selectedVer}`}
              defaultValue={version.body}
              rows={14}
              className="w-full rounded-lg bg-black/40 border border-border/60 p-4 text-xs font-mono text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/40 resize-none"
            />
          </div>

          {/* Per-version metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <MetricField
              k="Avg latency"
              v={`${version.avgLatencyMs}ms`}
              trend={prevVersion ? prevVersion.avgLatencyMs - version.avgLatencyMs : null}
              trendLabel="ms faster"
              positive
            />
            <MetricField k="Avg tokens" v={version.avgTokens.toLocaleString()} trend={null} />
            <MetricField k="Cost / run" v={version.costPerRun} trend={null} />
            <MetricField
              k="Success rate"
              v={`${version.score}%`}
              trend={delta ? parseFloat(delta) : null}
              trendLabel="vs prev"
              positive
            />
          </div>

          {/* Version history table */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
              Version history
            </div>
            <div className="rounded-lg border border-border/50 divide-y divide-border/40 overflow-hidden">
              {[...prompt.versions].reverse().map((v, idx) => {
                const isActive = v.version === selectedVer;
                const isHead = idx === 0;
                return (
                  <button
                    key={v.version}
                    onClick={() => setSelectedVer(v.version)}
                    className={`w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-white/[0.04] transition-colors ${isActive ? "bg-white/[0.05]" : ""}`}
                  >
                    <div className="flex items-center gap-1.5 shrink-0">
                      <TrendingUp
                        className={`h-3 w-3 ${isHead ? "text-[var(--emerald)]" : "text-muted-foreground/40"}`}
                      />
                      <span
                        className={`text-xs font-mono font-semibold ${isActive ? "text-[var(--electric)]" : ""}`}
                      >
                        {v.version}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground flex-1 text-left truncate">
                      {v.changelog}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] tabular-nums text-muted-foreground">
                        {v.score}%
                      </span>
                      <span className="text-[10px] text-muted-foreground/50">{v.date}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </Panel>
      </div>

      <DiffModal open={diffOpen} onClose={() => setDiffOpen(false)} prompt={prompt} />
    </div>
  );
}

function MetricField({
  k,
  v,
  trend,
  trendLabel,
  positive = false,
}: {
  k: string;
  v: string;
  trend: number | null;
  trendLabel?: string;
  positive?: boolean;
}) {
  const good = positive ? (trend ?? 0) > 0 : (trend ?? 0) < 0;
  return (
    <div className="rounded-lg bg-white/[0.03] border border-border/60 px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{k}</div>
      <div className="text-sm font-semibold tabular-nums">{v}</div>
      {trend !== null && trend !== 0 && (
        <div
          className={`text-[10px] mt-0.5 ${good ? "text-[var(--emerald)]" : "text-[var(--destructive)]"}`}
        >
          {trend > 0 ? "+" : ""}
          {trend} {trendLabel}
        </div>
      )}
    </div>
  );
}
