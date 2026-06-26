import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Play, RotateCcw, Rewind, FileText, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, StatBadge, StatusDot } from "@/components/ui/page";
import { DEMO_NODES, useDemo, type DemoNodeId } from "@/lib/demo-context";
import {
  FINAL_OUTPUT_FILENAME,
  FINAL_OUTPUT_MARKDOWN,
  FINAL_OUTPUT_TITLE,
} from "@/lib/final-output";
import { CopyButton } from "@/components/CopyButton";

export const Route = createFileRoute("/workflow")({
  head: () => ({
    meta: [
      { title: "Workflow Canvas — GPT Omni Agents" },
      {
        name: "description",
        content: "LangGraph-style multi-agent orchestration with live execution status.",
      },
    ],
  }),
  component: WorkflowPage,
});

// Two-row zigzag layout in a 1200 × 520 viewBox.
const POSITIONS: Record<DemoNodeId, { x: number; y: number; kind: string }> = {
  user: { x: 60, y: 240, kind: "input" },
  planner: { x: 220, y: 140, kind: "agent" },
  research: { x: 400, y: 320, kind: "agent" },
  code: { x: 580, y: 140, kind: "agent" },
  docs: { x: 760, y: 320, kind: "agent" },
  qa: { x: 920, y: 140, kind: "agent" },
  reviewer: { x: 1060, y: 320, kind: "agent" },
  final: { x: 1140, y: 240, kind: "output" },
};
const NODE_W = 132;
const NODE_H = 56;
const EDGES: Array<{ from: DemoNodeId; to: DemoNodeId }> = [
  { from: "user", to: "planner" },
  { from: "planner", to: "research" },
  { from: "planner", to: "code" },
  { from: "research", to: "docs" },
  { from: "code", to: "docs" },
  { from: "docs", to: "qa" },
  { from: "qa", to: "reviewer" },
  { from: "reviewer", to: "final" },
];

function edgePath(a: { x: number; y: number }, b: { x: number; y: number }) {
  const sx = a.x + NODE_W / 2;
  const sy = a.y + NODE_H / 2;
  const ex = b.x - NODE_W / 2;
  const ey = b.y + NODE_H / 2;
  const mx = (sx + ex) / 2;
  return `M ${sx} ${sy} C ${mx} ${sy}, ${mx} ${ey}, ${ex} ${ey}`;
}

function WorkflowPage() {
  const demo = useDemo();
  const [activeId, setActiveId] = useState<DemoNodeId>("planner");
  const [showOutput, setShowOutput] = useState(false);
  const active = DEMO_NODES.find((n) => n.id === activeId)!;
  const activeStatus = demo.statuses[activeId];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workflow Canvas"
        description="LangGraph-style orchestration. Animate runs, inspect nodes, and replay traces."
        actions={
          <>
            <Button
              onClick={demo.start}
              disabled={demo.isRunning}
              className="bg-gradient-to-r from-[var(--electric)] to-[var(--violet)] text-white border-0"
            >
              <Play className="h-3.5 w-3.5 mr-1.5" /> {demo.isComplete ? "Run Again" : "Run"}
            </Button>
            <Button variant="outline" onClick={demo.start}>
              <Rewind className="h-3.5 w-3.5 mr-1.5" /> Replay
            </Button>
            <Button variant="outline" onClick={demo.reset}>
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Reset
            </Button>
            {demo.isComplete && (
              <Button variant="outline" onClick={() => setShowOutput((v) => !v)}>
                <FileText className="h-3.5 w-3.5 mr-1.5" /> {showOutput ? "Hide" : "View"} output
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-4">
        <Panel className="p-0 overflow-hidden">
          <div
            className="relative grid-bg w-full"
            style={{ aspectRatio: "1200 / 520", minHeight: 380 }}
          >
            <svg
              viewBox="0 0 1200 520"
              className="absolute inset-0 w-full h-full"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <linearGradient id="edgeActive" x1="0" x2="1">
                  <stop offset="0%" stopColor="oklch(0.72 0.2 250)" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="oklch(0.68 0.22 295)" stopOpacity="0.95" />
                </linearGradient>
                <linearGradient id="edgeDone" x1="0" x2="1">
                  <stop offset="0%" stopColor="oklch(0.78 0.17 165)" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="oklch(0.78 0.17 165)" stopOpacity="0.6" />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {EDGES.map((e, i) => {
                const a = POSITIONS[e.from];
                const b = POSITIONS[e.to];
                const fromStatus = demo.statuses[e.from];
                const toStatus = demo.statuses[e.to];
                const isRunning =
                  (fromStatus === "success" && toStatus === "running") ||
                  (fromStatus === "running" && toStatus === "queued");
                const isDone = fromStatus === "success" && toStatus === "success";
                const d = edgePath(a, b);
                const stroke = isRunning
                  ? "url(#edgeActive)"
                  : isDone
                    ? "url(#edgeDone)"
                    : "oklch(1 0 0 / 0.14)";
                return (
                  <g key={i}>
                    <path
                      d={d}
                      fill="none"
                      stroke={stroke}
                      strokeWidth={isRunning ? 2.4 : 1.6}
                      strokeDasharray={isRunning ? "6 6" : "0"}
                      className={isRunning ? "animate-dash" : ""}
                      filter={isRunning ? "url(#glow)" : undefined}
                    />
                    {isRunning && (
                      <circle r="4" fill="oklch(0.96 0.02 250)" filter="url(#glow)">
                        <animateMotion dur="1.1s" repeatCount="indefinite" path={d} />
                      </circle>
                    )}
                  </g>
                );
              })}

              {DEMO_NODES.map((n) => {
                const p = POSITIONS[n.id];
                const s = demo.statuses[n.id];
                const isActive = activeId === n.id;
                const fill =
                  s === "running"
                    ? "oklch(0.22 0.06 260)"
                    : s === "success"
                      ? "oklch(0.22 0.05 165)"
                      : s === "error"
                        ? "oklch(0.22 0.08 25)"
                        : "oklch(0.18 0.03 264)";
                const stroke = isActive
                  ? "oklch(0.72 0.2 250)"
                  : s === "running"
                    ? "oklch(0.72 0.2 250)"
                    : s === "success"
                      ? "oklch(0.78 0.17 165)"
                      : s === "error"
                        ? "oklch(0.65 0.22 25)"
                        : "oklch(1 0 0 / 0.14)";
                return (
                  <g
                    key={n.id}
                    transform={`translate(${p.x - NODE_W / 2}, ${p.y - NODE_H / 2})`}
                    style={{ cursor: "pointer" }}
                    onClick={() => setActiveId(n.id)}
                  >
                    <rect
                      width={NODE_W}
                      height={NODE_H}
                      rx={12}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={isActive ? 2 : 1.2}
                      filter={s === "running" ? "url(#glow)" : undefined}
                    />
                    <circle
                      cx={14}
                      cy={NODE_H / 2}
                      r={4}
                      fill={
                        s === "success"
                          ? "oklch(0.78 0.17 165)"
                          : s === "running"
                            ? "oklch(0.72 0.2 250)"
                            : s === "queued"
                              ? "oklch(0.82 0.17 75)"
                              : s === "error"
                                ? "oklch(0.65 0.22 25)"
                                : "oklch(0.55 0.02 256)"
                      }
                    >
                      {(s === "running" || s === "queued") && (
                        <animate
                          attributeName="opacity"
                          values="1;0.3;1"
                          dur="1.2s"
                          repeatCount="indefinite"
                        />
                      )}
                    </circle>
                    <text
                      x={28}
                      y={NODE_H / 2 - 2}
                      fill="oklch(0.96 0.01 256)"
                      fontSize="11"
                      fontWeight="600"
                    >
                      {n.label}
                    </text>
                    <text x={28} y={NODE_H / 2 + 14} fill="oklch(0.7 0.03 256)" fontSize="9.5">
                      {n.agent === "—" ? p.kind : n.agent.replace(" Agent", "")}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Timeline */}
          <div className="border-t border-border/60 p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Execution timeline
              </div>
              <div className="text-[10px] text-muted-foreground">{demo.logs.length} events</div>
            </div>
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              {DEMO_NODES.map((n, i) => {
                const s = demo.statuses[n.id];
                const reached = s === "running" || s === "success";
                return (
                  <div key={n.id} className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setActiveId(n.id)}
                      className={`flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md border transition ${activeId === n.id ? "border-[var(--electric)] bg-[var(--electric)]/10" : "border-border/60 bg-white/[0.03] hover:bg-white/[0.06]"}`}
                    >
                      <StatusDot
                        status={
                          s === "success"
                            ? "success"
                            : s === "running"
                              ? "running"
                              : s === "queued"
                                ? "queued"
                                : "idle"
                        }
                      />
                      <span className="font-medium">{n.label}</span>
                    </button>
                    {i < DEMO_NODES.length - 1 && (
                      <div
                        className={`h-px w-4 ${reached ? "bg-[var(--electric)]/60" : "bg-border"}`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </Panel>

        <Panel>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Node
              </div>
              <div className="mt-1 text-lg font-semibold">{active.label}</div>
            </div>
            <StatBadge
              tone={
                activeStatus === "success"
                  ? "success"
                  : activeStatus === "running"
                    ? "info"
                    : activeStatus === "error"
                      ? "error"
                      : "default"
              }
            >
              {activeStatus}
            </StatBadge>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{active.agent}</div>

          <div className="mt-4 space-y-2.5 text-sm">
            <Field label="Status" value={activeStatus} />
            <Field label="Latency" value={activeStatus === "idle" ? "—" : "820ms"} />
            <Field label="Tokens" value={activeStatus === "idle" ? "—" : "1,248"} />
            <Field label="Cost" value={activeStatus === "idle" ? "—" : "$0.04"} />
            <Field
              label="Retries"
              value={
                active.id === "docs" && (activeStatus === "success" || activeStatus === "running")
                  ? "1"
                  : "0"
              }
            />
          </div>

          <div className="mt-4 text-[10px] uppercase tracking-[0.16em] text-muted-foreground flex items-center justify-between">
            <span>Payload</span>
            <CopyButton text={`{"node":"${active.id}","agent":"${active.agent}"}`} />
          </div>
          <pre className="mt-1 rounded-lg bg-black/40 border border-border/60 p-3 text-[11px] font-mono text-muted-foreground whitespace-pre-wrap">
            {`{
  "node": "${active.id}",
  "agent": "${active.agent}",
  "status": "${activeStatus}"
}`}
          </pre>

          <div className="mt-4 text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-1.5">
            Recent logs
          </div>
          <div className="rounded-lg bg-white/[0.03] border border-border/60 p-2 max-h-44 overflow-auto space-y-1">
            {demo.logs
              .filter((l) => l.agent === active.agent)
              .slice(-8)
              .map((l, i) => (
                <div key={i} className="text-[11px] font-mono flex gap-1.5">
                  <span className="text-muted-foreground">{l.ts}</span>
                  <span
                    className={
                      l.tone === "warn"
                        ? "text-[var(--amber)]"
                        : l.tone === "error"
                          ? "text-[var(--destructive)]"
                          : l.tone === "success"
                            ? "text-[var(--emerald)]"
                            : "text-muted-foreground"
                    }
                  >
                    {l.message}
                  </span>
                </div>
              ))}
            {demo.logs.filter((l) => l.agent === active.agent).length === 0 && (
              <div className="text-[11px] text-muted-foreground">
                No events yet. Run the workflow.
              </div>
            )}
          </div>
        </Panel>
      </div>

      {/* Final output */}
      {(demo.isComplete || showOutput) && (
        <Panel>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-[var(--electric)]/30 to-[var(--violet)]/30 grid place-items-center">
                <FileText className="h-4 w-4 text-[var(--cyan)]" />
              </div>
              <div>
                <div className="text-sm font-semibold">{FINAL_OUTPUT_TITLE}</div>
                <div className="text-xs text-muted-foreground font-mono">
                  {FINAL_OUTPUT_FILENAME} · 18.4 KB · approved by Reviewer
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatBadge tone="success">QA 14/14 passed</StatBadge>
              <CopyButton text={FINAL_OUTPUT_MARKDOWN} />
              <button className="h-7 px-2 rounded-md text-[11px] bg-white/5 border border-border/60 hover:bg-white/10 inline-flex items-center gap-1.5">
                <Maximize2 className="h-3 w-3" /> Open
              </button>
            </div>
          </div>
          <pre className="mt-4 rounded-xl bg-black/50 border border-border/60 p-4 text-[11.5px] font-mono leading-relaxed text-muted-foreground whitespace-pre-wrap overflow-x-auto max-h-[420px] overflow-y-auto">
            {FINAL_OUTPUT_MARKDOWN}
          </pre>
        </Panel>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground capitalize">{label}</span>
      <span className="font-semibold capitalize">{value}</span>
    </div>
  );
}
