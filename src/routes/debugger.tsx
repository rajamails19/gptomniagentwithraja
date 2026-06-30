import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  EmptyState,
  PageHeader,
  Panel,
  StatBadge,
  StatusBadge,
  StatusDot,
} from "@/components/ui/page";
import { recentExecutions } from "@/lib/mock-data";
import { CopyButton } from "@/components/CopyButton";
import { useDemo, type DemoNodeId } from "@/lib/demo-context";
import { AlertTriangle, Download, FileText, RefreshCw, GitBranch } from "lucide-react";
import { toast } from "sonner";
import { getAgentScores, getDecisionCards, getMemoryUsage } from "@/lib/demo/intelligence";
import { getMemories } from "@/lib/api/client";
import type { ApiMemory } from "@/lib/api/schemas";

export const Route = createFileRoute("/debugger")({
  head: () => ({
    meta: [
      { title: "Debugger — OmniAgents" },
      {
        name: "description",
        content:
          "Step through any agent execution: prompts, tool calls, memory, retries, and final output.",
      },
    ],
  }),
  component: DebuggerPage,
});

function DebuggerPage() {
  const demo = useDemo();
  const currentRun = demo.currentRun;
  // Centralized execution list — completed demo runs surface here automatically.
  const executions = useMemo(() => {
    const completed = demo.completedExecutions.filter((item) => item.id !== currentRun.id);
    return [currentRun, ...completed, ...recentExecutions];
  }, [currentRun, demo.completedExecutions]);
  const [exec, setExec] = useState(currentRun.id);
  const [backendMemories, setBackendMemories] = useState<ApiMemory[]>([]);
  // Keep selection in sync when a fresh demo run finishes.
  const effectiveExec = executions.some((e) => e.id === exec) ? exec : executions[0].id;
  const selected = executions.find((e) => e.id === effectiveExec)!;
  const isDemoRun = selected.id === currentRun.id;
  const [stepId, setStepId] = useState<DemoNodeId>("docs");
  const step = currentRun.stepRuns.find((s) => s.id === stepId) ?? currentRun.stepRuns[0];
  const stepTraceEvents = currentRun.traceEvents.filter((event) => event.stepId === step.id);
  const stepToolCalls = currentRun.toolCalls.filter((toolCall) => toolCall.stepId === step.id);
  const primaryToolCall = stepToolCalls[0];
  const retryEvents = stepTraceEvents.filter(
    (event) => event.type === "retry" || event.tone === "warn" || event.tone === "error",
  );
  const failed = step.status === "retried" || step.status === "failed";
  const scores = getAgentScores(step);
  const memoryUsage = getMemoryUsage(step);
  const stepMemoryIds = [...new Set(stepTraceEvents.flatMap((event) => event.memoryIds ?? []))];
  const stepMemories = backendMemories.filter((memory) => stepMemoryIds.includes(memory.id));
  const decisions = getDecisionCards(currentRun);
  const tracePayload = useMemo(
    () => ({
      run: {
        id: currentRun.id,
        scenarioId: currentRun.scenarioId,
        goal: currentRun.goal,
        status: currentRun.status,
        currentStepId: currentRun.currentStepId,
      },
      selectedStep: {
        id: step.id,
        label: step.label,
        agent: step.agent,
        model: step.model,
        status: step.status,
        prompt: step.promptSummary,
        input: step.inputSummary,
        memoryContext: step.memoryContext,
        latencyMs: step.latencyMs,
        tokens: step.tokens,
        cost: step.cost,
        outputSummary: step.outputSummary,
      },
      traceEvents: stepTraceEvents,
      toolCalls: stepToolCalls,
      finalArtifact: {
        title: currentRun.finalArtifact.title,
        filename: currentRun.finalArtifact.filename,
        status: currentRun.finalArtifact.status,
        approvedBy: currentRun.finalArtifact.approvedBy,
        sizeLabel: currentRun.finalArtifact.sizeLabel,
      },
    }),
    [currentRun, step, stepToolCalls, stepTraceEvents],
  );
  const traceJson = useMemo(() => JSON.stringify(tracePayload, null, 2), [tracePayload]);
  const artifactSummary = `${currentRun.finalArtifact.title} (${currentRun.finalArtifact.filename}) · ${currentRun.finalArtifact.status} by ${currentRun.finalArtifact.approvedBy} · ${currentRun.finalArtifact.sizeLabel}. ${step.outputSummary}`;

  useEffect(() => {
    let active = true;
    getMemories()
      .then((memories) => {
        if (active) setBackendMemories(memories);
      })
      .catch(() => {
        if (active) setBackendMemories([]);
      });
    return () => {
      active = false;
    };
  }, [currentRun.traceEvents.length]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Debugger"
        description="Trace every agent decision: prompt, tool call, retry, memory read, and approved artifact."
        actions={
          <>
            <StatBadge tone={demo.liveConnectionStatus === "connected" ? "success" : "warn"}>
              SSE {demo.liveConnectionStatus}
            </StatBadge>
            <select
              value={effectiveExec}
              onChange={(e) => setExec(e.target.value)}
              aria-label="Select execution trace"
              className="h-9 w-full rounded-lg border border-border/60 bg-white/5 px-3 text-xs transition focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/55 sm:w-auto sm:max-w-[60vw]"
            >
              {executions.map((e) => (
                <option key={e.id} value={e.id} className="bg-popover">
                  {e.id} · {e.workflow}
                </option>
              ))}
            </select>
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl glass p-4 border border-[var(--electric)]/20">
          <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Selected execution
          </div>
          <div className="mt-1 text-sm font-semibold truncate">{selected.workflow}</div>
          <div className="mt-1 text-xs text-muted-foreground font-mono">{selected.id}</div>
        </div>
        <div className="rounded-xl glass p-4">
          <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            What this proves
          </div>
          <div className="mt-1 text-sm font-semibold">Observable agent execution</div>
          <p className="mt-1 text-xs text-muted-foreground">
            View the exact prompt, tool call, retry, and reviewer-approved output.
          </p>
        </div>
        <div className="rounded-xl glass p-4 flex flex-col justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Demo path
            </div>
            <div className="mt-1 text-sm font-semibold">Workflow → Debugger → Artifact</div>
          </div>
          <Link
            to="/workflow"
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-border/60 bg-white/[0.04] px-3 text-xs font-medium hover:bg-white/[0.08]"
          >
            <GitBranch className="h-3.5 w-3.5" /> View Workflow
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[300px_1fr] gap-4">
        <Panel className="p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">
                {isDemoRun ? selected.workflow : "Trace"}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {isDemoRun
                  ? `${selected.id} · 7 steps · 1 retry · ${selected.duration}`
                  : "7 steps · 1 retry · 9.4s total"}
              </div>
            </div>
            <StatBadge tone={isDemoRun ? "success" : "info"}>
              {isDemoRun ? "demo selected" : "sample trace"}
            </StatBadge>
          </div>
          <div className="p-2 relative">
            <div className="absolute left-[28px] top-3 bottom-3 w-px bg-border/60" />
            {currentRun.stepRuns.map((s, i) => {
              const active = stepId === s.id;
              const isRetry = s.status === "retried" || s.status === "failed";
              return (
                <button
                  key={s.id}
                  onClick={() => setStepId(s.id)}
                  className={`relative w-full rounded-lg px-3 py-2.5 text-left flex items-start gap-3 transition-[background,box-shadow,transform] duration-200 focus-visible:ring-2 focus-visible:ring-[var(--ring)]/55 ${active ? "bg-[var(--electric)]/10 ring-1 ring-[var(--electric)]/60 shadow-[0_0_24px_-18px_oklch(0.72_0.2_250/0.8)]" : "hover:-translate-y-px hover:bg-white/[0.04]"}`}
                  aria-pressed={active}
                >
                  <div className="relative z-10 h-5 w-5 rounded-full grid place-items-center text-[10px] font-mono bg-background border border-border">
                    {isRetry ? <RefreshCw className="h-3 w-3 text-[var(--amber)]" /> : i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <StatusDot
                        status={
                          s.status === "running"
                            ? "running"
                            : isRetry
                              ? "error"
                              : s.status === "pending"
                                ? "queued"
                                : "success"
                        }
                      />
                      <span className="text-xs font-medium truncate">{s.label}</span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground truncate">
                      {s.agent}
                    </div>
                    <div className="mt-1 flex gap-2 text-[10px] text-muted-foreground tabular-nums">
                      <span>{s.latencyMs}ms</span>
                      <span>· {s.tokens.toLocaleString()} tok</span>
                      <span>· ${s.cost.toFixed(2)}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Panel>

        <Panel>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div>
              <div className="text-sm font-semibold">{step.label}</div>
              <div className="text-xs text-muted-foreground">
                {step.agent} · {step.latencyMs}ms · {step.tokens.toLocaleString()} tokens · $
                {step.cost.toFixed(2)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={failed ? "retrying" : step.status} />
              <StatBadge tone="info">step evidence</StatBadge>
            </div>
          </div>

          <div
            data-guide="debugger-proof"
            className="mb-4 rounded-xl border border-border/60 bg-white/[0.03] p-3 text-xs text-muted-foreground"
          >
            This proof screen demonstrates observability, auditability, and governance: every
            selected step exposes the agent, model, prompt, tool evidence, memory context, retry
            handling, cost, latency, and approved artifact trail.
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            <CopyButton text={traceJson} label="Copy trace" />
            <button
              type="button"
              onClick={() => {
                downloadJson(`${currentRun.id}-${step.id}-trace.json`, traceJson);
                toast("Trace Exported", {
                  description: `${step.label} trace JSON downloaded.`,
                  icon: <Download className="h-4 w-4 text-[var(--cyan)]" />,
                });
              }}
              className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border/60 bg-white/5 px-2 text-[11px] font-medium transition-[background,border-color,transform] duration-200 hover:-translate-y-px hover:bg-white/10 active:translate-y-0 focus-visible:ring-2 focus-visible:ring-[var(--ring)]/55"
            >
              <Download className="h-3 w-3" />
              Export trace JSON
            </button>
            <CopyButton text={artifactSummary} label="Copy artifact summary" />
          </div>

          <div className="mb-4 grid grid-cols-2 lg:grid-cols-6 gap-2">
            <Mini label="Agent" value={step.agent} />
            <Mini label="Model" value={step.model} />
            <Mini label="Status" value={step.status} />
            <Mini label="Latency" value={`${step.latencyMs}ms`} />
            <Mini label="Tokens" value={step.tokens.toLocaleString()} />
            <Mini label="Cost" value={`$${step.cost.toFixed(2)}`} />
          </div>

          <div className="mb-4 grid grid-cols-2 lg:grid-cols-4 gap-2">
            <Mini label="Confidence" value={`${scores.confidence}%`} />
            <Mini label="Risk level" value={scores.risk} />
            <Mini label="Quality score" value={`${scores.quality}%`} />
            <Mini label="Tool reliability" value={`${scores.toolReliability}%`} />
          </div>

          <div className="mb-4 grid md:grid-cols-2 gap-3">
            <div className="rounded-xl border border-border/60 bg-white/[0.03] p-3">
              <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Decision cards
              </div>
              <div className="mt-2 space-y-2">
                {decisions.slice(0, 3).map((decision) => (
                  <div key={decision.title} className="rounded-lg bg-black/20 p-2">
                    <div className="text-xs font-semibold">{decision.title}</div>
                    <div className="mt-1 text-[11px] text-muted-foreground">{decision.body}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-border/60 bg-white/[0.03] p-3">
              <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Memory movement
              </div>
              <div className="mt-2 space-y-1.5 text-[11px] text-muted-foreground">
                <MemoryLine label="Retrieved" items={memoryUsage.retrieved} />
                <MemoryLine label="New" items={memoryUsage.newMemories} />
                <MemoryLine label="Updated" items={memoryUsage.updatedMemories} />
                <MemoryLine label="Skipped" items={memoryUsage.skippedMemories} />
              </div>
              {stepMemoryIds.length > 0 && (
                <div className="mt-3 rounded-lg border border-[var(--cyan)]/20 bg-[var(--cyan)]/[0.06] p-2">
                  <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--cyan)]">
                    Backend memory IDs
                  </div>
                  <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                    {stepMemoryIds.join(", ")}
                  </div>
                </div>
              )}
              {stepMemories.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {stepMemories.slice(0, 3).map((memory) => (
                    <div key={memory.id} className="rounded-lg bg-black/20 p-2">
                      <div className="text-[11px] font-medium text-foreground">
                        {memory.scope} · {memory.source}
                      </div>
                      <div className="mt-1 text-[11px] text-muted-foreground line-clamp-2">
                        {memory.content}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mb-4 rounded-xl border border-border/60 bg-black/20 p-3">
            <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Matching workflow evidence
            </div>
            <div className="mt-2 space-y-2">
              {stepTraceEvents.length > 0 ? (
                stepTraceEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start justify-between gap-3 rounded-lg bg-white/[0.03] px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-medium">{event.message}</div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        {event.agent} · {event.type}
                      </div>
                      {(event.memoryIds?.length ?? 0) > 0 && (
                        <div className="mt-1 font-mono text-[10px] text-[var(--cyan)]">
                          memory: {event.memoryIds?.join(", ")}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 text-right text-[10px] text-muted-foreground tabular-nums">
                      <div>{event.latencyMs ? `${event.latencyMs}ms` : "queued"}</div>
                      <div>{event.cost ? `$${event.cost.toFixed(2)}` : "$0.00"}</div>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  title="No trace evidence for this step yet."
                  description="Run the demo workflow or choose a completed step to inspect prompt, tool, memory, retry, latency, and cost evidence."
                />
              )}
            </div>
          </div>

          {failed && (
            <div className="mb-4 rounded-xl border border-[var(--amber)]/40 bg-[oklch(0.82_0.17_75/0.08)] p-4">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-[var(--amber)]/15 grid place-items-center shrink-0">
                  <AlertTriangle className="h-4 w-4 text-[var(--amber)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">What went wrong?</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    <span className="font-mono text-[var(--amber)]">ToolTimeoutError</span> — the{" "}
                    <span className="font-mono">schema_to_md</span> tool exceeded the 2,500ms budget
                    while serializing a large OpenAPI document. The orchestrator applied an
                    exponential backoff (600ms, ±15% jitter) and retried automatically.
                  </p>
                  <div className="mt-3 grid sm:grid-cols-3 gap-2 text-[11px]">
                    <Mini label="Attempts" value="2" />
                    <Mini label="Backoff" value="600ms" />
                    <Mini label="Resolved in" value="2,410ms" />
                  </div>
                  <div className="mt-3 text-[11px] text-muted-foreground">
                    <span className="font-medium text-foreground">Suggested fix:</span> raise tool
                    budget to 4s for schemas &gt; 12KB, or pre-chunk the schema via{" "}
                    <span className="font-mono">schema.split(by=tag)</span>.
                  </div>
                </div>
              </div>
            </div>
          )}

          <Tabs defaultValue="prompt">
            <TabsList className="bg-white/5 border border-border/60 flex-wrap h-auto">
              <TabsTrigger value="prompt">Prompt</TabsTrigger>
              <TabsTrigger value="response">LLM Response</TabsTrigger>
              <TabsTrigger value="tool">Tool Call</TabsTrigger>
              <TabsTrigger value="result">Tool Result</TabsTrigger>
              <TabsTrigger value="memory">Memory</TabsTrigger>
              <TabsTrigger value="error">Retry/Error</TabsTrigger>
              <TabsTrigger value="final">Final Output</TabsTrigger>
            </TabsList>

            <TabsContent value="prompt">
              <CodeBlock>{`AGENT: ${step.agent}
MODEL: ${step.model}
PROMPT: ${step.promptSummary}
INPUT: ${step.inputSummary}
STATUS: ${step.status}`}</CodeBlock>
            </TabsContent>

            <TabsContent value="response">
              <CodeBlock>{`{
  "step": "${step.label}",
  "agent": "${step.agent}",
  "status": "${step.status}",
  "output_summary": "${step.outputSummary}"
}`}</CodeBlock>
            </TabsContent>

            <TabsContent value="tool">
              <CodeBlock>
                {stepToolCalls.length > 0
                  ? stepToolCalls
                      .map(
                        (toolCall) => `tool: ${toolCall.tool}
status: ${toolCall.status}
args: {
  "step": "${step.id}",
  "input": "${toolCall.inputSummary}"
}`,
                      )
                      .join("\n\n")
                  : `tool: waiting_for_step
args: {
  "step": "${step.id}",
  "input": "Tool evidence appears when this step runs."
}`}
              </CodeBlock>
            </TabsContent>

            <TabsContent value="result">
              <CodeBlock>
                {stepToolCalls.length > 0
                  ? JSON.stringify(
                      stepToolCalls.map((toolCall) => ({
                        ok: toolCall.status !== "error",
                        tool: toolCall.tool,
                        status: toolCall.status,
                        latency_ms: toolCall.latencyMs,
                        result_summary: toolCall.outputSummary,
                      })),
                      null,
                      2,
                    )
                  : JSON.stringify(
                      {
                        ok: false,
                        step: step.id,
                        summary: "No tool result for this step yet.",
                      },
                      null,
                      2,
                    )}
              </CodeBlock>
            </TabsContent>

            <TabsContent value="memory">
              <CodeBlock>{`memory_context: ${JSON.stringify(step.memoryContext, null, 2)}
governance_note: "Context is scoped to the selected workflow step and included in exported trace evidence."
write_summary: "${step.outputSummary}"`}</CodeBlock>
            </TabsContent>

            <TabsContent value="error">
              <CodeBlock>{`step:      ${step.label}
status:    ${step.status}
events:    ${stepTraceEvents.length}
retry_events:
${retryEvents.length > 0 ? retryEvents.map((event) => `- ${event.message}`).join("\n") : "- none"}
primary_tool: ${primaryToolCall?.tool ?? "not required"}
recovered:  ${retryEvents.length > 0 && step.status !== "failed"}`}</CodeBlock>
            </TabsContent>

            <TabsContent value="final">
              <div className="mt-3 rounded-xl border border-border/60 bg-black/30 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-border/60 bg-white/[0.03]">
                  <div className="flex items-center gap-2 text-xs min-w-0">
                    <FileText className="h-3.5 w-3.5 text-[var(--cyan)]" />
                    <span className="font-medium truncate">{currentRun.finalArtifact.title}</span>
                    <span className="text-muted-foreground font-mono">
                      · {currentRun.finalArtifact.filename}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatBadge tone="success">QA 14/14</StatBadge>
                    <CopyButton text={currentRun.finalArtifact.markdown} label="Copy markdown" />
                  </div>
                </div>
                <pre className="p-4 text-[11.5px] font-mono leading-relaxed text-muted-foreground whitespace-pre-wrap overflow-x-auto max-h-[420px] overflow-y-auto">
                  {currentRun.finalArtifact.markdown}
                </pre>
              </div>
            </TabsContent>
          </Tabs>
        </Panel>
      </div>
    </div>
  );
}

function downloadJson(filename: string, payload: string) {
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-black/30 border border-border/60 px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="text-xs font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function MemoryLine({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <span className="font-medium text-foreground">{label}:</span>{" "}
      {items.length > 0 ? items.join(", ") : "none"}
    </div>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <div className="mt-3 relative group">
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition">
        <CopyButton text={children} />
      </div>
      <pre className="rounded-lg bg-black/50 border border-border/60 p-4 text-xs font-mono text-muted-foreground whitespace-pre-wrap overflow-x-auto">
        {children}
      </pre>
    </div>
  );
}
