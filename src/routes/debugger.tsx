import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader, Panel, StatBadge, StatusDot } from "@/components/ui/page";
import { recentExecutions } from "@/lib/mock-data";
import { CopyButton } from "@/components/CopyButton";
import { useDemo, DEMO_EXECUTION, type DemoNodeId } from "@/lib/demo-context";
import { AlertTriangle, FileText, RefreshCw, GitBranch } from "lucide-react";

export const Route = createFileRoute("/debugger")({
  head: () => ({
    meta: [
      { title: "Debugger — GPT Omni Agents" },
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
  const executions = useMemo(
    () => [...demo.completedExecutions, ...recentExecutions],
    [demo.completedExecutions],
  );
  const [exec, setExec] = useState(executions[0].id);
  // Keep selection in sync when a fresh demo run finishes.
  const effectiveExec = executions.some((e) => e.id === exec) ? exec : executions[0].id;
  const selected = executions.find((e) => e.id === effectiveExec)!;
  const isDemoRun = selected.id === DEMO_EXECUTION.id;
  const [stepId, setStepId] = useState<DemoNodeId>("docs");
  const step = currentRun.stepRuns.find((s) => s.id === stepId) ?? currentRun.stepRuns[0];
  const stepTraceEvents = currentRun.traceEvents.filter((event) => event.stepId === step.id);
  const stepToolCalls = currentRun.toolCalls.filter((toolCall) => toolCall.stepId === step.id);
  const primaryToolCall = stepToolCalls[0];
  const failed = step.status === "retried" || step.status === "failed";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Debugger"
        description="Trace every agent decision: prompt, tool call, retry, memory read, and approved artifact."
        actions={
          <select
            value={effectiveExec}
            onChange={(e) => setExec(e.target.value)}
            className="h-9 px-3 rounded-lg bg-white/5 border border-border/60 text-xs max-w-[60vw]"
          >
            {executions.map((e) => (
              <option key={e.id} value={e.id} className="bg-popover">
                {e.id} · {e.workflow}
              </option>
            ))}
          </select>
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
                  className={`relative w-full text-left rounded-lg px-3 py-2.5 flex items-start gap-3 transition ${active ? "bg-[var(--electric)]/10 ring-1 ring-[var(--electric)]/60 shadow-[0_0_24px_-18px_oklch(0.72_0.2_250/0.8)]" : "hover:bg-white/[0.04]"}`}
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
              <StatBadge
                tone={
                  step.status === "running"
                    ? "info"
                    : failed
                      ? "warn"
                      : step.status === "pending"
                        ? "default"
                        : "success"
                }
              >
                {step.status}
              </StatBadge>
              <StatBadge tone="info">step evidence</StatBadge>
            </div>
          </div>

          <div className="mb-4 rounded-xl border border-border/60 bg-white/[0.03] p-3 text-xs text-muted-foreground">
            This panel shows why the output is trustworthy: each step exposes the model prompt, tool
            result, memory access, retry handling, and final artifact.
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
              <CodeBlock>{`SYSTEM: You are the Documentation Agent.
USER: Draft markdown reference for endpoints in payments-svc.
CONTEXT: {
  "schema_id": "openapi://payments@v4.2",
  "style_guide": "v3.2"
}`}</CodeBlock>
            </TabsContent>

            <TabsContent value="response">
              <CodeBlock>{`{
  "draft": "# Payments API\\n\\n## POST /payments/intents\\n...",
  "needs": ["error_table", "idempotency_note"]
}`}</CodeBlock>
            </TabsContent>

            <TabsContent value="tool">
              <CodeBlock>{`tool: ${primaryToolCall?.tool ?? "waiting_for_step"}
args: {
  "step": "${step.id}",
  "input": "${primaryToolCall?.inputSummary ?? "Tool evidence appears when this step runs."}"
}`}</CodeBlock>
            </TabsContent>

            <TabsContent value="result">
              <CodeBlock>{`{
  "ok": ${primaryToolCall ? primaryToolCall.status !== "error" : false},
  "latency_ms": ${primaryToolCall?.latencyMs ?? 0},
  "summary": "${primaryToolCall?.outputSummary ?? "No tool result for this step yet."}"
}`}</CodeBlock>
            </TabsContent>

            <TabsContent value="memory">
              <CodeBlock>{`reads: [
  "payments_arch_v3", "style_guide_v3.2", "openapi_payments_v4.2"
]
writes: [
  "draft:payments_docs:v1"
]`}</CodeBlock>
            </TabsContent>

            <TabsContent value="error">
              <CodeBlock>{`step:      ${step.label}
status:    ${step.status}
events:    ${stepTraceEvents.length}
attempt 1: ${step.id === "docs" ? "ToolTimeoutError schema_to_md exceeded 2500ms" : "not required"}
backoff:    600ms (exponential, jitter ±15%)
attempt 2:  ${step.id === "docs" ? "ok in 2410ms" : "not required"}
recovered:  ${step.id === "docs"}`}</CodeBlock>
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
                    <CopyButton text={currentRun.finalArtifact.markdown} />
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

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-black/30 border border-border/60 px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="text-xs font-semibold tabular-nums">{value}</div>
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
