import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Play, RotateCcw, Rewind, FileText, Bug, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  EmptyState,
  PageHeader,
  Panel,
  StatBadge,
  StatusBadge,
  StatusDot,
} from "@/components/ui/page";
import { useDemo, type DemoNodeId } from "@/lib/demo-context";
import { CopyButton } from "@/components/CopyButton";
import {
  AGENT_PHASES,
  getAgentConversation,
  getAgentPhaseIndex,
  getAgentScores,
  getDecisionCards,
  getExecutionSummary,
  getMemoryUsage,
  getToolEvidence,
} from "@/lib/demo/intelligence";

export const Route = createFileRoute("/workflow")({
  head: () => ({
    meta: [
      { title: "Workflow Canvas — OmniAgents" },
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
const WORKFLOW_ANIMATION_ORDER: DemoNodeId[] = [
  "user",
  "planner",
  "research",
  "code",
  "docs",
  "qa",
  "reviewer",
  "final",
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
  const currentRun = demo.currentRun;
  const [activeId, setActiveId] = useState<DemoNodeId>("planner");
  const [showOutput, setShowOutput] = useState(false);
  const [animatedNodeId, setAnimatedNodeId] = useState<DemoNodeId | null>(null);
  const [animatedNodeIds, setAnimatedNodeIds] = useState<Set<DemoNodeId>>(() => new Set());
  const [animationLogs, setAnimationLogs] = useState<
    Array<{ ts: string; agent: string; message: string; tone: "success" }>
  >([]);
  const animationTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const active = currentRun.stepRuns.find((n) => n.id === activeId) ?? currentRun.stepRuns[1];
  const activeStatus = demo.statuses[activeId];
  const activePhase = getAgentPhaseIndex(active);
  const activeScores = getAgentScores(active);
  const memoryUsage = getMemoryUsage(active);
  const toolEvidence = getToolEvidence(currentRun.toolCalls, active);
  const decisions = getDecisionCards(currentRun);
  const conversation = getAgentConversation(currentRun);
  const summary = getExecutionSummary(currentRun);
  const activeLogs = [...demo.logs, ...animationLogs]
    .filter((log) => log.agent === active.agent)
    .slice(-8);

  const clearWorkflowAnimation = () => {
    animationTimers.current.forEach(clearTimeout);
    animationTimers.current = [];
    setAnimatedNodeId(null);
    setAnimatedNodeIds(new Set());
    setAnimationLogs([]);
  };

  const startWorkflowAnimation = () => {
    clearWorkflowAnimation();
    WORKFLOW_ANIMATION_ORDER.forEach((nodeId, index) => {
      animationTimers.current.push(
        setTimeout(() => {
          const step = currentRun.stepRuns.find((node) => node.id === nodeId);
          if (!step) return;
          setActiveId(nodeId);
          setAnimatedNodeId(nodeId);
          setAnimatedNodeIds((previous) => new Set(previous).add(nodeId));
          setAnimationLogs((previous) => [
            ...previous,
            {
              ts: new Date().toLocaleTimeString([], { hour12: false }),
              agent: step.agent,
              message: `${step.label} activated in the demo workflow sequence.`,
              tone: "success",
            },
          ]);
        }, index * 500),
      );
    });
  };

  useEffect(() => () => clearWorkflowAnimation(), []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workflow Canvas"
        description="Follow the investor demo from user request to reviewed final artifact."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              data-guide="workflow-run"
              onClick={() => {
                startWorkflowAnimation();
                demo.start();
              }}
              disabled={demo.isRunning}
              className="bg-gradient-to-r from-[var(--electric)] to-[var(--violet)] text-white border-0 shadow-[0_10px_30px_-16px_oklch(0.72_0.2_250/0.9)]"
            >
              <Play className="h-3.5 w-3.5 mr-1.5" />{" "}
              {demo.isComplete ? "Run Demo Again" : "Run Demo Workflow"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                startWorkflowAnimation();
                demo.start();
              }}
              disabled={demo.isRunning}
            >
              <Rewind className="h-3.5 w-3.5 mr-1.5" /> Replay
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                clearWorkflowAnimation();
                setActiveId("planner");
                demo.reset();
              }}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Reset
            </Button>
            <Button asChild variant="outline">
              <Link to="/debugger">
                <Bug className="h-3.5 w-3.5 mr-1.5" /> View in Debugger
              </Link>
            </Button>
            {demo.isComplete && (
              <Button onClick={() => setShowOutput((v) => !v)}>
                <FileText className="h-3.5 w-3.5 mr-1.5" />{" "}
                {showOutput ? "Hide Artifact" : "View Final Artifact"}
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-4">
        <Panel className="p-0 overflow-hidden">
          <div className="border-b border-border/60 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold">{currentRun.goal}</div>
              <div className="text-xs text-muted-foreground">
                Planner routes work across research, code, docs, QA, and reviewer agents.
              </div>
            </div>
            <StatBadge tone={demo.isComplete ? "success" : demo.isRunning ? "info" : "default"}>
              {demo.isComplete ? "Approved" : demo.isRunning ? "Running live" : "Ready"}
            </StatBadge>
          </div>
          <div
            data-guide="workflow-canvas"
            className="relative grid-bg w-full"
            style={{ aspectRatio: "1200 / 520", minHeight: 320 }}
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
                <filter id="greenGlow">
                  <feGaussianBlur stdDeviation="5" result="b" />
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

              {currentRun.stepRuns.map((n) => {
                const p = POSITIONS[n.id];
                const s = demo.statuses[n.id];
                const isActive = activeId === n.id;
                const isAnimationActive = animatedNodeId === n.id;
                const wasAnimationActivated = animatedNodeIds.has(n.id);
                const fill = isAnimationActive
                  ? "oklch(0.24 0.07 165)"
                  : s === "running"
                    ? "oklch(0.22 0.06 260)"
                    : s === "success"
                      ? "oklch(0.22 0.05 165)"
                      : s === "error"
                        ? "oklch(0.22 0.08 25)"
                        : "oklch(0.18 0.03 264)";
                const stroke =
                  isAnimationActive || wasAnimationActivated
                    ? "oklch(0.78 0.17 165)"
                    : isActive
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
                    role="button"
                    tabIndex={0}
                    aria-label={`Select ${n.label} workflow node`}
                    onClick={() => setActiveId(n.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setActiveId(n.id);
                      }
                    }}
                  >
                    <rect
                      width={NODE_W}
                      height={NODE_H}
                      rx={12}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={isAnimationActive || isActive ? 2 : 1.2}
                      filter={
                        isAnimationActive
                          ? "url(#greenGlow)"
                          : s === "running"
                            ? "url(#glow)"
                            : undefined
                      }
                    />
                    <circle
                      cx={14}
                      cy={NODE_H / 2}
                      r={4}
                      fill={
                        isAnimationActive || wasAnimationActivated || s === "success"
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
              <div className="text-[10px] text-muted-foreground">
                {currentRun.traceEvents.length} events
              </div>
            </div>
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              {currentRun.stepRuns.map((n, i) => {
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
                    {i < currentRun.stepRuns.length - 1 && (
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

        <Panel className={activeStatus === "running" ? "ring-1 ring-[var(--electric)]/35" : ""}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Selected node
              </div>
              <div className="mt-1 text-lg font-semibold">{active.label}</div>
            </div>
            <StatusBadge status={activeStatus} />
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {active.agent === "—"
              ? "Boundary step in the demo workflow"
              : `${active.agent} handles this step in the run.`}
          </div>

          <div className="mt-4 space-y-2.5 text-sm">
            <Field label="Status" value={activeStatus} />
            <Field
              label="Latency"
              value={activeStatus === "idle" ? "—" : `${active.latencyMs}ms`}
            />
            <Field
              label="Tokens"
              value={activeStatus === "idle" ? "—" : active.tokens.toLocaleString()}
            />
            <Field
              label="Cost"
              value={activeStatus === "idle" ? "—" : `$${active.cost.toFixed(2)}`}
            />
            <Field
              label="Retries"
              value={
                active.status === "retried" || (active.id === "docs" && activeStatus === "running")
                  ? "1"
                  : "0"
              }
            />
          </div>

          <div className="mt-4">
            <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-2">
              Agent thinking timeline
            </div>
            <div className="grid gap-1.5">
              {AGENT_PHASES.map((phase, index) => (
                <div
                  key={phase}
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px] ${
                    index === activePhase
                      ? "bg-[var(--electric)]/10 text-foreground"
                      : index < activePhase
                        ? "bg-[var(--emerald)]/5 text-muted-foreground"
                        : "bg-white/[0.025] text-muted-foreground/70"
                  }`}
                >
                  <StatusDot
                    status={
                      index === activePhase && active.status === "running"
                        ? "running"
                        : index < activePhase
                          ? "success"
                          : "idle"
                    }
                  />
                  {phase}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Mini label="Confidence" value={`${activeScores.confidence}%`} />
            <Mini label="Risk" value={activeScores.risk} />
            <Mini label="Quality" value={`${activeScores.quality}%`} />
            <Mini label="Tool reliability" value={`${activeScores.toolReliability}%`} />
          </div>

          <div className="mt-4 grid gap-2">
            <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Memory usage
            </div>
            <MemoryRow label="Retrieved" items={memoryUsage.retrieved} />
            <MemoryRow label="New" items={memoryUsage.newMemories} />
            <MemoryRow label="Updated" items={memoryUsage.updatedMemories} />
            <MemoryRow label="Skipped" items={memoryUsage.skippedMemories} />
          </div>

          <div className="mt-4">
            <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-1.5">
              Tool usage
            </div>
            {toolEvidence.length > 0 ? (
              <div className="space-y-2">
                {toolEvidence.map((tool) => (
                  <div
                    key={tool.id}
                    className="rounded-lg border border-border/60 bg-white/[0.03] p-2"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-mono text-[var(--cyan)]">{tool.tool}</span>
                      <StatusBadge status={tool.status === "retry" ? "retrying" : tool.status} />
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      Input: {tool.inputSummary}
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      Output: {tool.outputSummary}
                    </div>
                    <div className="mt-1 text-[10px] text-muted-foreground">
                      Duration: {tool.latencyMs}ms
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-border/60 bg-white/[0.03] p-2 text-[11px] text-muted-foreground">
                Tool evidence appears when this agent calls an approved tool.
              </div>
            )}
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
            {activeLogs.map((l, i) => (
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
            {activeLogs.length === 0 && (
              <EmptyState
                title="No node events yet."
                description="Run the workflow or select an agent that has already executed to inspect its recent log events."
              />
            )}
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel>
          <div className="text-sm font-semibold">Inter-agent conversation</div>
          <div className="mt-3 space-y-2">
            {conversation.map((item) => (
              <div
                key={`${item.agent}-${item.message}`}
                className="rounded-lg border border-border/60 bg-white/[0.03] p-3"
              >
                <div className="text-xs font-semibold text-[var(--cyan)]">{item.agent}</div>
                <div className="mt-1 text-xs text-muted-foreground">{item.message}</div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <div className="text-sm font-semibold">Decision cards</div>
          <div className="mt-3 grid gap-2">
            {decisions.map((decision) => (
              <div
                key={decision.title}
                className="rounded-lg border border-border/60 bg-white/[0.03] p-3"
              >
                <div className="text-xs font-semibold">{decision.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">{decision.body}</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {(demo.isComplete || currentRun.traceEvents.length > 0) && (
        <Panel>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="text-sm font-semibold">Execution summary</div>
              <div className="text-xs text-muted-foreground">
                Deterministic run summary for {demo.selectedScenario.title}
              </div>
            </div>
            <StatusBadge status={summary.finalStatus === "Approved" ? "approved" : "running"} />
          </div>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-2">
            <Mini label="Agents used" value={String(summary.agentsUsed)} />
            <Mini label="Tool calls" value={String(summary.toolCalls)} />
            <Mini label="Execution time" value={summary.executionTime} />
            <Mini label="Total cost" value={summary.totalCost} />
            <Mini label="Retries" value={String(summary.retries)} />
            <Mini label="Quality" value={summary.quality} />
            <Mini label="Final status" value={summary.finalStatus} />
          </div>
        </Panel>
      )}

      {/* Final output */}
      {(demo.isComplete || showOutput) && (
        <Panel>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-[var(--electric)]/30 to-[var(--violet)]/30 grid place-items-center">
                <FileText className="h-4 w-4 text-[var(--cyan)]" />
              </div>
              <div>
                <div className="text-sm font-semibold">{currentRun.finalArtifact.title}</div>
                <div className="text-xs text-muted-foreground font-mono">
                  {currentRun.finalArtifact.filename} · {currentRun.finalArtifact.sizeLabel} ·
                  approved by {currentRun.finalArtifact.approvedBy}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatBadge tone="success">
                <CheckCircle2 className="h-3 w-3" /> QA 14/14 passed
              </StatBadge>
              <CopyButton text={currentRun.finalArtifact.markdown} />
              <StatBadge tone="info">Preview artifact</StatBadge>
            </div>
          </div>
          <pre className="mt-4 rounded-xl bg-black/50 border border-border/60 p-4 text-[11.5px] font-mono leading-relaxed text-muted-foreground whitespace-pre-wrap overflow-x-auto max-h-[420px] overflow-y-auto">
            {currentRun.finalArtifact.markdown}
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

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-white/[0.03] px-2.5 py-2">
      <div className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="text-xs font-semibold tabular-nums truncate">{value}</div>
    </div>
  );
}

function MemoryRow({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-border/60 bg-white/[0.03] p-2">
      <div className="text-[10px] font-semibold text-muted-foreground">{label}</div>
      <div className="mt-1 flex flex-wrap gap-1">
        {items.length > 0 ? (
          items.map((item) => (
            <span
              key={item}
              className="rounded-md bg-white/[0.05] px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground"
            >
              {item}
            </span>
          ))
        ) : (
          <span className="text-[10px] text-muted-foreground">None</span>
        )}
      </div>
    </div>
  );
}
