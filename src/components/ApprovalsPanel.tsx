import type { ApiApprovalRequest } from "@/lib/api/schemas";
import { approveApproval, getApprovals, rejectApproval } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Panel, StatBadge } from "@/components/ui/page";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";

export function ApprovalsPanel() {
  const [approvals, setApprovals] = useState<ApiApprovalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  async function refresh() {
    try {
      const next = await getApprovals();
      setApprovals(next);
    } catch {
      setApprovals([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 4000);
    return () => window.clearInterval(timer);
  }, []);

  const pending = approvals.filter((approval) => approval.status === "pending");
  const recent = approvals.slice(0, 3);

  async function decide(id: string, decision: "approve" | "reject") {
    setActionId(id);
    try {
      if (decision === "approve") {
        await approveApproval(id, "Approved in demo control room.");
      } else {
        await rejectApproval(id, "Rejected in demo control room.");
      }
      await refresh();
    } finally {
      setActionId(null);
    }
  }

  return (
    <Panel className="border-[oklch(0.82_0.17_75/0.22)] bg-[oklch(0.82_0.17_75/0.06)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[var(--amber)]" aria-hidden="true" />
            <h2 className="text-sm font-semibold">Human approval gates</h2>
            <StatBadge tone={pending.length ? "warn" : "success"}>
              {pending.length ? `${pending.length} pending` : "Clear"}
            </StatBadge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Scenario policies pause sensitive releases before final artifact publishing.
          </p>
        </div>

        <div className="grid w-full gap-2 lg:max-w-3xl">
          {isLoading ? (
            <div className="h-16 animate-pulse rounded-xl bg-white/5" />
          ) : pending.length ? (
            pending.map((approval) => (
              <div
                key={approval.id}
                className="rounded-xl border border-white/10 bg-background/55 p-3"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatBadge tone={approval.riskLevel === "high" ? "error" : "warn"}>
                        {approval.riskLevel} risk
                      </StatBadge>
                      <span className="text-sm font-semibold">{approval.requestedAction}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{approval.reason}</p>
                    <p className="mt-2 line-clamp-2 text-xs text-foreground/80">
                      {approval.artifactPreview}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={actionId === approval.id}
                      onClick={() => void decide(approval.id, "reject")}
                    >
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      disabled={actionId === approval.id}
                      onClick={() => void decide(approval.id, "approve")}
                    >
                      Approve
                    </Button>
                  </div>
                </div>
              </div>
            ))
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

          {!pending.length && recent.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {recent.map((approval) => (
                <StatBadge key={approval.id} status={approval.status}>
                  {approval.status}
                </StatBadge>
              ))}
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}
