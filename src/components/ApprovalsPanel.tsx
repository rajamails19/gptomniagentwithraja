import type { ApiApprovalRequest } from "@/lib/api/schemas";
import { approveApproval, getApprovals, getRunApprovals, rejectApproval } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Panel, StatBadge } from "@/components/ui/page";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type Decision = "approve" | "reject";

interface PendingDecision {
  approval: ApiApprovalRequest;
  decision: Decision;
}

function riskColors(level: ApiApprovalRequest["riskLevel"]) {
  if (level === "critical")
    return {
      badge: "error" as const,
      border: "border-[oklch(0.65_0.22_25/0.45)]",
      bg: "bg-[oklch(0.65_0.22_25/0.06)]",
    };
  if (level === "high")
    return {
      badge: "error" as const,
      border: "border-[oklch(0.65_0.22_25/0.3)]",
      bg: "bg-[oklch(0.65_0.22_25/0.04)]",
    };
  if (level === "medium")
    return {
      badge: "warn" as const,
      border: "border-[oklch(0.82_0.17_75/0.3)]",
      bg: "bg-[oklch(0.82_0.17_75/0.04)]",
    };
  return {
    badge: "info" as const,
    border: "border-white/10",
    bg: "bg-background/55",
  };
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function ArtifactPreview({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > 180;
  return (
    <div>
      <p
        className={`break-words text-xs text-foreground/80 leading-relaxed ${expanded ? "" : "line-clamp-2"}`}
      >
        {text}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3 w-3" /> Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" /> Show full preview
            </>
          )}
        </button>
      )}
    </div>
  );
}

function DecisionDialog({
  pending,
  onClose,
  onConfirm,
  isSubmitting,
}: {
  pending: PendingDecision | null;
  onClose: () => void;
  onConfirm: (note: string) => void;
  isSubmitting: boolean;
}) {
  const [note, setNote] = useState("");

  useEffect(() => {
    if (pending) setNote("");
  }, [pending]);

  const isApprove = pending?.decision === "approve";

  return (
    <Dialog open={Boolean(pending)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isApprove ? (
              <CheckCircle2 className="h-4 w-4 text-[var(--emerald)]" />
            ) : (
              <XCircle className="h-4 w-4 text-[var(--destructive)]" />
            )}
            {isApprove ? "Approve release" : "Reject release"}
          </DialogTitle>
          <DialogDescription>
            {isApprove
              ? "The run will resume and publish the final artifact."
              : "The run will be halted and marked as rejected."}
          </DialogDescription>
        </DialogHeader>

        {pending && (
          <div className="space-y-3">
            <div className="rounded-lg border border-border/60 bg-black/20 p-3 space-y-1">
              <div className="text-xs font-semibold text-foreground">
                {pending.approval.requestedAction}
              </div>
              <div className="text-[11px] text-muted-foreground">{pending.approval.reason}</div>
              <div className="mt-2 text-[11px] text-foreground/70 leading-relaxed line-clamp-3">
                {pending.approval.artifactPreview}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground" htmlFor="reviewer-note">
                Reviewer note{" "}
                <span className="text-muted-foreground/50 font-normal">(optional)</span>
              </label>
              <textarea
                id="reviewer-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  isApprove
                    ? "e.g. Reviewed artifact — looks good to ship."
                    : "e.g. Risk too high, needs another QA pass."
                }
                rows={3}
                maxLength={1000}
                className="mt-1 w-full rounded-md border border-border/60 bg-black/20 px-3 py-2 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-[var(--electric)] resize-none"
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={() => onConfirm(note.trim())}
            disabled={isSubmitting}
            className={
              isApprove
                ? "bg-[var(--emerald)] hover:bg-[var(--emerald)]/90 text-black border-0"
                : "bg-[var(--destructive)] hover:bg-[var(--destructive)]/90 text-white border-0"
            }
          >
            {isSubmitting
              ? isApprove
                ? "Approving…"
                : "Rejecting…"
              : isApprove
                ? "Confirm approval"
                : "Confirm rejection"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RecentDecisions({ decisions }: { decisions: ApiApprovalRequest[] }) {
  if (!decisions.length) return null;
  return (
    <div className="mt-3 space-y-2">
      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        Recent decisions
      </div>
      {decisions.map((d) => (
        <div
          key={d.id}
          className="flex items-start gap-2 rounded-lg border border-white/8 bg-background/30 px-3 py-2"
        >
          {d.status === "approved" ? (
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--emerald)]" />
          ) : (
            <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--destructive)]" />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium">
                {d.status === "approved" ? "Approved" : "Rejected"}
              </span>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
                <Clock className="h-2.5 w-2.5" />
                {d.decidedAt ? timeAgo(d.decidedAt) : timeAgo(d.createdAt)}
              </span>
            </div>
            <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {d.requestedAction}
            </div>
            {d.reviewerNote && (
              <div className="mt-1 text-[11px] text-foreground/60 italic">
                &ldquo;{d.reviewerNote}&rdquo;
              </div>
            )}
            <div className="mt-1 font-mono text-[9px] text-muted-foreground/50">{d.runId}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ApprovalsPanel({ runId }: { runId?: string | null }) {
  const [approvals, setApprovals] = useState<ApiApprovalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingDecision, setPendingDecision] = useState<PendingDecision | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastDecision, setLastDecision] = useState<{
    decision: Decision;
    approval: ApiApprovalRequest;
  } | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = runId ? await getRunApprovals(runId) : await getApprovals();
      setApprovals(next);
    } catch {
      setApprovals([]);
    } finally {
      setIsLoading(false);
    }
  }, [runId]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 4000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const pending = approvals.filter((a) => a.status === "pending");
  const decided = approvals.filter((a) => a.status === "approved" || a.status === "rejected");

  function openDialog(approval: ApiApprovalRequest, decision: Decision) {
    setLastDecision(null);
    setPendingDecision({ approval, decision });
  }

  async function handleConfirm(note: string) {
    if (!pendingDecision) return;
    const { approval, decision } = pendingDecision;
    setIsSubmitting(true);
    try {
      if (decision === "approve") {
        await approveApproval(approval.id, note || "Approved via OmniAgents control room.");
      } else {
        await rejectApproval(approval.id, note || "Rejected via OmniAgents control room.");
      }
      setLastDecision({ decision, approval });
      setPendingDecision(null);
      toast.success(decision === "approve" ? "Run approved — execution resuming" : "Run rejected", {
        duration: 3000,
      });
      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Failed to ${decision} — ${message}`, { duration: 6000 });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <DecisionDialog
        pending={pendingDecision}
        onClose={() => setPendingDecision(null)}
        onConfirm={handleConfirm}
        isSubmitting={isSubmitting}
      />

      <Panel className="border-[oklch(0.82_0.17_75/0.22)] bg-[oklch(0.82_0.17_75/0.06)]">
        <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          {/* Header */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[var(--amber)]" aria-hidden="true" />
              <h2 className="text-sm font-semibold">Human approval gates</h2>
              <StatBadge tone={pending.length ? "warn" : "success"}>
                {pending.length ? `${pending.length} pending` : "Clear"}
              </StatBadge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {runId
                ? "Showing approval gates for the active workflow run."
                : "Scenario policies pause sensitive releases before final artifact publishing."}
            </p>
          </div>

          {/* Right column */}
          <div className="w-full min-w-0 space-y-2 lg:max-w-3xl">
            {/* Post-decision banner */}
            {lastDecision && (
              <div
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all ${
                  lastDecision.decision === "approve"
                    ? "border-[oklch(0.78_0.17_165/0.4)] bg-[oklch(0.78_0.17_165/0.08)]"
                    : "border-[oklch(0.65_0.22_25/0.4)] bg-[oklch(0.65_0.22_25/0.08)]"
                }`}
              >
                {lastDecision.decision === "approve" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--emerald)]" />
                ) : (
                  <ShieldX className="h-4 w-4 shrink-0 text-[var(--destructive)]" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {lastDecision.decision === "approve"
                      ? "Run approved — resuming execution"
                      : "Run rejected — execution halted"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {lastDecision.approval.requestedAction}
                  </p>
                </div>
              </div>
            )}

            {/* Loading skeleton */}
            {isLoading ? (
              <div className="h-16 animate-pulse rounded-xl bg-white/5" />
            ) : pending.length > 0 ? (
              pending.map((approval) => {
                const { border, bg, badge } = riskColors(approval.riskLevel);
                return (
                  <div
                    key={approval.id}
                    className={`rounded-xl border ${border} ${bg} p-4 space-y-3`}
                  >
                    {/* Top row: badges + action label */}
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <StatBadge tone={badge}>{approval.riskLevel} risk</StatBadge>
                      <span className="min-w-0 flex-1 text-sm font-semibold">
                        {approval.requestedAction}
                      </span>
                      <span className="flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground sm:ml-auto">
                        <Clock className="h-3 w-3" />
                        {timeAgo(approval.createdAt)}
                      </span>
                    </div>

                    {/* Reason */}
                    <p className="text-xs text-muted-foreground">{approval.reason}</p>

                    {/* Artifact preview with expand */}
                    <div className="min-w-0 rounded-md border border-white/8 bg-black/20 px-3 py-2">
                      <div className="mb-1 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                        Artifact preview
                      </div>
                      <ArtifactPreview text={approval.artifactPreview} />
                    </div>

                    {/* Action buttons */}
                    <div className="grid grid-cols-1 gap-2 pt-1 sm:flex sm:justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full border-[var(--destructive)]/40 text-[var(--destructive)] hover:bg-[var(--destructive)]/10 hover:border-[var(--destructive)]/70 sm:w-auto"
                        onClick={() => openDialog(approval, "reject")}
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1.5" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        className="w-full bg-[var(--emerald)] hover:bg-[var(--emerald)]/90 text-black border-0 shadow-[0_6px_20px_-8px_oklch(0.78_0.17_165/0.8)] sm:w-auto"
                        onClick={() => openDialog(approval, "approve")}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                        Approve
                      </Button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-background/45 p-3">
                <ShieldAlert className="h-4 w-4 text-[var(--emerald)]" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium">No pending approvals</p>
                  <p className="text-xs text-muted-foreground">
                    Run a gated scenario to see approval request, decision, and trace events here.
                  </p>
                </div>
              </div>
            )}

            <RecentDecisions decisions={decided.slice(0, 5)} />
          </div>
        </div>
      </Panel>
    </>
  );
}
