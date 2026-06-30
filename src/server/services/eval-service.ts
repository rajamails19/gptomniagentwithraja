import type { ApiEvalCheck, ApiEvalReport, ApiRun } from "@/lib/api/schemas";

import { approvalRepository } from "../approvals/ApprovalRepository";
import { artifactRepository } from "../repositories/artifact-repository";
import { evalRepository } from "../repositories/eval-repository";
import { runRepository } from "../repositories/run-repository";
import { toolExecutionRepository } from "../repositories/tool-execution-repository";
import { traceRepository } from "../repositories/trace-repository";
import { notFound } from "../utils/errors";

export class EvalService {
  listReports(): ApiEvalReport[] {
    this.ensureReportsForCompletedRuns();
    return evalRepository.listRecent();
  }

  getReportForRun(runId: string): ApiEvalReport {
    const existing = evalRepository.findByRunId(runId);
    if (existing) return existing;

    const run = runRepository.findById(runId);
    if (!run) throw notFound("Run not found");
    if (run.status !== "completed") throw notFound("Eval report is not ready for this run");

    return this.generateForRun(run);
  }

  generateForRun(run: ApiRun): ApiEvalReport {
    const existing = evalRepository.findByRunId(run.id);
    const reportId = existing?.id ?? `eval_${run.id}`;
    const now = new Date().toISOString();
    const steps = runRepository.listSteps(run.id);
    const trace = traceRepository.listForRun(run.id) ?? [];
    const artifact = artifactRepository.findForRun(run.id);
    const approvals = approvalRepository.listForRun(run.id);
    const toolExecutions = toolExecutionRepository.listForRun(run.id);

    const completedSteps = steps.filter((step) => step.status === "completed").length;
    const stepScore = scorePercent(completedSteps, Math.max(steps.length, 1));
    const traceScore = trace.length >= steps.length ? 96 : Math.max(65, trace.length * 10);
    const artifactScore = artifact?.status === "approved" ? 96 : artifact ? 82 : 35;
    const failedToolCount = toolExecutions.filter((tool) => tool.status === "error").length;
    const toolEvidenceCount =
      toolExecutions.length || trace.filter((event) => event.type === "tool_call").length;
    const toolScore =
      failedToolCount > 0
        ? Math.max(60, 94 - failedToolCount * 14)
        : toolEvidenceCount > 0
          ? 95
          : 82;
    const approvalRejected = approvals.some((approval) => approval.status === "rejected");
    const approvalPending = approvals.some((approval) => approval.status === "pending");
    const approvalApproved = approvals.some((approval) => approval.status === "approved");
    const approvalScore = approvalRejected ? 45 : approvalPending ? 72 : approvalApproved ? 98 : 92;
    const costScore =
      run.costSummary.modelSavingsPercent >= 35
        ? 96
        : run.costSummary.modelSavingsPercent >= 20
          ? 88
          : 76;

    const checks = [
      this.createCheck({
        reportId,
        runId: run.id,
        category: "completeness",
        name: "Workflow steps completed",
        score: stepScore,
        evidence: `${completedSteps}/${steps.length} workflow steps completed.`,
        source: "workflow_steps",
      }),
      this.createCheck({
        reportId,
        runId: run.id,
        category: "traceability",
        name: "Trace evidence captured",
        score: traceScore,
        evidence: `${trace.length} trace events persisted for audit review.`,
        source: "trace_events",
      }),
      this.createCheck({
        reportId,
        runId: run.id,
        category: "accuracy",
        name: "Final artifact approved",
        score: artifactScore,
        evidence: artifact
          ? `${artifact.title} is ${artifact.status} by ${artifact.approvedBy ?? "reviewer"}.`
          : "No final artifact was found for this run.",
        source: "artifacts",
      }),
      this.createCheck({
        reportId,
        runId: run.id,
        category: "tooling",
        name: "Tool calls validated",
        score: toolScore,
        evidence:
          toolExecutions.length > 0
            ? `${toolExecutions.length} tool executions logged with ${failedToolCount} failures.`
            : `${toolEvidenceCount} tool call trace events found for this run.`,
        source: toolExecutions.length > 0 ? "tool_executions" : "trace_events",
      }),
      this.createCheck({
        reportId,
        runId: run.id,
        category: "approval",
        name: "Human approval policy",
        score: approvalScore,
        evidence:
          approvals.length > 0
            ? `${approvals.length} approval request(s), latest status: ${approvals[0]?.status}.`
            : "No approval gate was required for this run.",
        source: "approval_requests",
      }),
      this.createCheck({
        reportId,
        runId: run.id,
        category: "cost",
        name: "Cost and model routing",
        score: costScore,
        evidence: `$${run.costSummary.totalCost.toFixed(2)}, ${run.costSummary.totalTokens.toLocaleString()} tokens, ${run.costSummary.modelSavingsPercent}% model savings.`,
        source: "runs.cost_summary",
      }),
    ];

    const qualityScore = average([stepScore, artifactScore, traceScore]);
    const safetyScore = average([approvalScore, toolScore]);
    const traceabilityScore = traceScore;
    const overallScore = average([qualityScore, safetyScore, costScore, traceabilityScore]);
    const status: ApiEvalReport["status"] =
      overallScore >= 90 && !approvalRejected ? "passed" : overallScore >= 75 ? "review" : "failed";
    const releaseDecision: ApiEvalReport["releaseDecision"] =
      status === "passed" && !approvalPending
        ? "approved"
        : status === "failed" || approvalRejected
          ? "blocked"
          : "needs_review";

    return evalRepository.upsert({
      id: reportId,
      runId: run.id,
      scenarioId: run.scenarioId,
      workflow: run.workflow,
      status,
      releaseDecision,
      overallScore,
      qualityScore,
      safetyScore,
      costScore,
      traceabilityScore,
      summary: buildSummary(run, overallScore, releaseDecision, checks),
      generatedAt: now,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      checks,
    });
  }

  private ensureReportsForCompletedRuns() {
    runRepository
      .list()
      .filter((run) => run.status === "completed")
      .forEach((run) => {
        if (!evalRepository.findByRunId(run.id)) {
          this.generateForRun(run);
        }
      });
  }

  private createCheck(input: {
    reportId: string;
    runId: string;
    category: ApiEvalCheck["category"];
    name: string;
    score: number;
    evidence: string;
    source: string;
  }): ApiEvalCheck {
    return {
      id: `check_${input.runId}_${input.category}`,
      reportId: input.reportId,
      runId: input.runId,
      category: input.category,
      name: input.name,
      status: input.score >= 90 ? "passed" : input.score >= 75 ? "warning" : "failed",
      score: input.score,
      severity: input.score >= 90 ? "low" : input.score >= 75 ? "medium" : "high",
      evidence: input.evidence,
      source: input.source,
      createdAt: new Date().toISOString(),
    };
  }
}

function scorePercent(value: number, total: number) {
  return Math.round((value / total) * 100);
}

function average(values: number[]) {
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function buildSummary(
  run: ApiRun,
  overallScore: number,
  releaseDecision: ApiEvalReport["releaseDecision"],
  checks: ApiEvalCheck[],
) {
  const warnings = checks.filter((check) => check.status === "warning").length;
  const failures = checks.filter((check) => check.status === "failed").length;
  const decision =
    releaseDecision === "approved"
      ? "approved for release"
      : releaseDecision === "blocked"
        ? "blocked pending remediation"
        : "requires review";
  return `${run.workflow} scored ${overallScore}% and is ${decision}. ${warnings} warning(s), ${failures} failed check(s).`;
}

export const evalService = new EvalService();
