import type { ApiRun } from "@/lib/api/schemas";
import type { DemoScenario } from "@/lib/demo/types";
import { badRequest, notFound } from "../utils/errors";
import { approvalPolicy } from "./ApprovalPolicy";
import { approvalRepository } from "./ApprovalRepository";

export class ApprovalService {
  listApprovals() {
    return approvalRepository.list();
  }

  getApproval(id: string) {
    const approval = approvalRepository.findById(id);
    if (!approval) throw notFound("Approval request not found");
    return approval;
  }

  listForRun(runId: string) {
    return approvalRepository.listForRun(runId);
  }

  ensureBeforeFinalArtifact(run: ApiRun, scenario: DemoScenario) {
    const existingPending = approvalRepository.findPendingForRun(run.id);
    if (existingPending) return existingPending;

    const existingTerminal = approvalRepository.findTerminalForRun(run.id);
    if (existingTerminal) return existingTerminal;

    const decision = approvalPolicy.evaluateBeforeFinalArtifact(run, scenario);
    if (!decision.required) return null;

    return approvalRepository.create({
      runId: run.id,
      scenarioId: scenario.id,
      agentId: decision.agentId,
      stepId: decision.stepId,
      reason: decision.reason,
      riskLevel: decision.riskLevel,
      requestedAction: decision.requestedAction,
      artifactPreview: decision.artifactPreview,
    });
  }

  approve(id: string, reviewerNote?: string) {
    const approval = this.getApproval(id);
    if (approval.status !== "pending") {
      throw badRequest(`Approval request is already ${approval.status}.`);
    }
    const updated = approvalRepository.approve(id, reviewerNote);
    if (!updated) throw notFound("Approval request not found");
    return updated;
  }

  reject(id: string, reviewerNote?: string) {
    const approval = this.getApproval(id);
    if (approval.status !== "pending") {
      throw badRequest(`Approval request is already ${approval.status}.`);
    }
    const updated = approvalRepository.reject(id, reviewerNote);
    if (!updated) throw notFound("Approval request not found");
    return updated;
  }
}

export const approvalService = new ApprovalService();
