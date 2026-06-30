import { useNavigate } from "@tanstack/react-router";
import {
  CheckCircle2,
  FileText,
  GitBranch,
  ShieldAlert,
  ShieldCheck,
  Timer,
  Wrench,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { CopyButton } from "@/components/CopyButton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatBadge } from "@/components/ui/page";
import { useDemo } from "@/lib/demo-context";
import { getExecutionSummary } from "@/lib/demo/intelligence";

export function DemoResultsModal() {
  const demo = useDemo();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const lastShownEventKey = useRef<string | null>(null);
  const run = demo.currentRun;
  const summary = useMemo(() => getExecutionSummary(run), [run]);
  const completedSteps = run.stepRuns.filter((step) => step.status === "completed").length;
  const isReviewGate =
    demo.hasStartedRunInSession &&
    Boolean(demo.activeBackendRunId) &&
    !demo.isRunning &&
    !demo.isComplete &&
    completedSteps >= run.stepRuns.length - 1;
  const resultMode = demo.isComplete ? "completed" : isReviewGate ? "review" : null;
  const resultRunId = demo.lastCompletedId ?? demo.activeBackendRunId;

  useEffect(() => {
    if (!resultMode || !resultRunId) return;

    const eventKey = `${resultMode}:${resultRunId}`;
    if (lastShownEventKey.current === eventKey) return;

    lastShownEventKey.current = eventKey;
    setOpen(true);
  }, [resultMode, resultRunId]);

  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener("omniagents:close-demo-results", close);
    return () => window.removeEventListener("omniagents:close-demo-results", close);
  }, []);

  const traceCount = run.traceEvents.length;
  const toolCount = run.toolCalls.length;
  const retryCount = run.stepRuns.filter((step) => step.status === "retried").length;
  const artifactPreview = run.finalArtifact.markdown.split("\n").slice(0, 7).join("\n");

  function closeAndNavigate(to: "/workflow" | "/debugger", hash?: string) {
    setOpen(false);
    void navigate({ to, hash });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        data-guide="demo-results-modal"
        className="max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-5xl overflow-hidden border-white/12 bg-[oklch(0.16_0.035_260/0.96)] p-0 shadow-[0_28px_90px_-36px_oklch(0.7_0.2_250/0.9)] backdrop-blur-xl sm:rounded-2xl"
      >
        <div className="max-h-[92vh] overflow-y-auto">
          <div className="border-b border-border/60 bg-gradient-to-br from-[oklch(0.26_0.08_245/0.72)] via-background/35 to-[oklch(0.22_0.08_295/0.55)] px-5 py-5 sm:px-6">
            <DialogHeader className="space-y-3 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <StatBadge tone="success">
                  {resultMode === "completed" ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <ShieldAlert className="h-3 w-3" />
                  )}{" "}
                  {resultMode === "completed" ? "Demo completed" : "Review needed"}
                </StatBadge>
                <StatBadge tone="info">{demo.selectedScenario.title}</StatBadge>
                {resultRunId && <StatBadge tone="default">{resultRunId}</StatBadge>}
              </div>
              <div>
                <DialogTitle className="text-2xl tracking-tight sm:text-3xl">
                  {resultMode === "completed" ? "Demo run results" : "Human approval checkpoint"}
                </DialogTitle>
                <DialogDescription className="mt-2 max-w-3xl text-sm leading-6">
                  {resultMode === "completed"
                    ? "OmniAgents planned the request, coordinated specialist agents, executed tools, wrote memory, passed QA, and produced an approved final artifact."
                    : "OmniAgents completed the automated agent work and paused before publishing the final artifact, so a human reviewer can approve or reject the release."}
                </DialogDescription>
              </div>
            </DialogHeader>
          </div>

          <div className="space-y-5 px-5 py-5 sm:px-6">
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <ResultMetric
                icon={GitBranch}
                label="Steps completed"
                value={`${completedSteps}/8`}
              />
              <ResultMetric icon={Wrench} label="Tool calls" value={String(toolCount)} />
              <ResultMetric icon={Timer} label="Execution time" value={summary.executionTime} />
              <ResultMetric
                icon={resultMode === "completed" ? ShieldCheck : ShieldAlert}
                label="Current status"
                value={resultMode === "completed" ? summary.finalStatus : "Review gate"}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.15fr]">
              <section className="rounded-2xl border border-border/60 bg-white/[0.035] p-4">
                <div className="text-sm font-semibold">What happened</div>
                <div className="mt-3 overflow-hidden rounded-xl border border-border/60">
                  <ResultRow label="Workflow" value={run.goal} />
                  <ResultRow label="Agents used" value={String(summary.agentsUsed)} />
                  <ResultRow label="Trace events" value={String(traceCount)} />
                  <ResultRow label="Retries" value={String(retryCount)} />
                  <ResultRow label="Cost" value={summary.totalCost} />
                  <ResultRow label="Quality score" value={summary.quality} />
                </div>
              </section>

              <section className="rounded-2xl border border-[var(--emerald)]/25 bg-[var(--emerald)]/[0.045] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold">{run.finalArtifact.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {run.finalArtifact.filename} · {run.finalArtifact.sizeLabel} · approved by{" "}
                      {run.finalArtifact.approvedBy}
                    </div>
                  </div>
                  <CopyButton text={run.finalArtifact.markdown} />
                </div>
                <pre className="mt-3 max-h-52 overflow-auto rounded-xl border border-border/60 bg-black/35 p-3 text-[11px] leading-relaxed text-muted-foreground whitespace-pre-wrap">
                  {artifactPreview}
                </pre>
              </section>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <ResultPill
                title="Planner"
                body="Split the request into an ordered multi-agent execution plan."
              />
              <ResultPill
                title="Tools + memory"
                body="Captured tool evidence and reusable context for later runs."
              />
              <ResultPill
                title="Governance"
                body={
                  resultMode === "completed"
                    ? "QA and reviewer checks produced an auditable approval trail."
                    : "The workflow paused before release so a human can approve the final artifact."
                }
              />
            </div>

            <div className="flex flex-col gap-2 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-end">
              <Button variant="outline" className="w-full sm:w-auto" onClick={() => setOpen(false)}>
                Close
              </Button>
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => closeAndNavigate("/debugger")}
              >
                Open Debugger
              </Button>
              <Button
                className="w-full bg-gradient-to-r from-[var(--electric)] to-[var(--violet)] text-white border-0 sm:w-auto"
                onClick={() =>
                  closeAndNavigate(
                    "/workflow",
                    resultMode === "completed" ? "final-artifact" : undefined,
                  )
                }
              >
                <FileText className="mr-1.5 h-4 w-4" />{" "}
                {resultMode === "completed" ? "Open Final Artifact" : "Open Approval Gate"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ResultMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CheckCircle2;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-white/[0.04] p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
        <Icon className="h-3.5 w-3.5 text-[var(--cyan)]" />
      </div>
      <div className="mt-2 truncate text-xl font-semibold">{value}</div>
    </div>
  );
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 border-b border-border/60 px-3 py-2.5 text-xs last:border-b-0">
      <div className="text-muted-foreground">{label}</div>
      <div className="min-w-0 font-medium text-foreground">{value}</div>
    </div>
  );
}

function ResultPill({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-white/[0.035] p-3">
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-1 text-xs leading-5 text-muted-foreground">{body}</div>
    </div>
  );
}
