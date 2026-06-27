import type { ApiApprovalRequest } from "@/lib/api/schemas";
import { desc, eq } from "drizzle-orm";
import { initializeDatabase } from "../db";
import { db } from "../db/connection";
import { approvalRequestsTable, type ApprovalRequestRow } from "../db/schema";
import type { ApprovalCreateInput } from "./types";

export class ApprovalRepository {
  constructor() {
    initializeDatabase();
  }

  list(): ApiApprovalRequest[] {
    return db
      .select()
      .from(approvalRequestsTable)
      .orderBy(desc(approvalRequestsTable.createdAt))
      .all()
      .map(toApiApproval);
  }

  findById(id: string): ApiApprovalRequest | undefined {
    const row = db
      .select()
      .from(approvalRequestsTable)
      .where(eq(approvalRequestsTable.id, id))
      .get();
    return row ? toApiApproval(row) : undefined;
  }

  listForRun(runId: string): ApiApprovalRequest[] {
    return db
      .select()
      .from(approvalRequestsTable)
      .where(eq(approvalRequestsTable.runId, runId))
      .orderBy(desc(approvalRequestsTable.createdAt))
      .all()
      .map(toApiApproval);
  }

  findPendingForRun(runId: string): ApiApprovalRequest | undefined {
    return this.listForRun(runId).find((approval) => approval.status === "pending");
  }

  findTerminalForRun(runId: string): ApiApprovalRequest | undefined {
    return this.listForRun(runId).find((approval) =>
      ["approved", "rejected", "skipped"].includes(approval.status),
    );
  }

  create(input: ApprovalCreateInput): ApiApprovalRequest {
    const now = new Date().toISOString();
    const approval: ApiApprovalRequest = {
      id: `approval_${crypto.randomUUID().slice(0, 8)}`,
      runId: input.runId,
      scenarioId: input.scenarioId,
      agentId: input.agentId,
      stepId: input.stepId,
      status: "pending",
      reason: input.reason,
      riskLevel: input.riskLevel,
      requestedAction: input.requestedAction,
      artifactPreview: input.artifactPreview,
      reviewerNote: null,
      createdAt: now,
      decidedAt: null,
    };

    db.insert(approvalRequestsTable)
      .values({
        id: approval.id,
        runId: approval.runId,
        scenarioId: approval.scenarioId,
        agentId: approval.agentId,
        stepId: approval.stepId,
        status: approval.status,
        reason: approval.reason,
        riskLevel: approval.riskLevel,
        requestedAction: approval.requestedAction,
        artifactPreview: approval.artifactPreview,
        reviewerNote: approval.reviewerNote,
        createdAt: approval.createdAt,
        decidedAt: approval.decidedAt,
      })
      .run();

    return approval;
  }

  approve(id: string, reviewerNote?: string): ApiApprovalRequest | undefined {
    return this.decide(id, "approved", reviewerNote);
  }

  reject(id: string, reviewerNote?: string): ApiApprovalRequest | undefined {
    return this.decide(id, "rejected", reviewerNote);
  }

  private decide(
    id: string,
    status: "approved" | "rejected",
    reviewerNote?: string,
  ): ApiApprovalRequest | undefined {
    const decidedAt = new Date().toISOString();
    db.update(approvalRequestsTable)
      .set({
        status,
        reviewerNote: reviewerNote?.trim() || null,
        decidedAt,
      })
      .where(eq(approvalRequestsTable.id, id))
      .run();
    return this.findById(id);
  }
}

function toApiApproval(row: ApprovalRequestRow): ApiApprovalRequest {
  return {
    id: row.id,
    runId: row.runId,
    scenarioId: row.scenarioId,
    agentId: row.agentId,
    stepId: row.stepId as ApiApprovalRequest["stepId"],
    status: row.status,
    reason: row.reason,
    riskLevel: row.riskLevel,
    requestedAction: row.requestedAction,
    artifactPreview: row.artifactPreview,
    reviewerNote: row.reviewerNote,
    createdAt: row.createdAt,
    decidedAt: row.decidedAt,
  };
}

export const approvalRepository = new ApprovalRepository();
