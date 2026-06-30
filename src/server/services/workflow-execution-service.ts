import type { ApiRun, ApiRunStatus } from "@/lib/api/schemas";
import type { TraceEvent } from "@/lib/demo/types";
import type { DemoScenario } from "@/lib/demo/types";
import { artifactRepository } from "../repositories/artifact-repository";
import { runRepository } from "../repositories/run-repository";
import { scenarioRepository } from "../repositories/scenario-repository";
import { traceRepository } from "../repositories/trace-repository";
import { orchestrator } from "../orchestrator/Orchestrator";
import { approvalService } from "../approvals/ApprovalService";
import { runEventService } from "../events/RunEventService";
import { evalService } from "./eval-service";
import { badRequest, notFound } from "../utils/errors";
import { getExecutionLogs, recordExecutionLog } from "../utils/execution-logger";

const STEP_DURATION_MS = 900;

export class WorkflowExecutionService {
  /** Tracks run IDs that have an active server-side execution loop. */
  private activeLoops = new Set<string>();

  /**
   * Proactively advance steps and push SSE events on a timer,
   * so the frontend SSE subscriber gets updates without polling.
   * Uses the same time-based advanceRun logic (idempotent event IDs prevent duplicates).
   */
  private scheduleExecution(runId: string, scenario: DemoScenario) {
    if (this.activeLoops.has(runId)) return;
    this.activeLoops.add(runId);

    const totalTicks = scenario.steps.length + 2; // extra ticks for approval/completion
    let tick = 0;

    const advance = () => {
      tick++;
      if (tick > totalTicks) {
        this.activeLoops.delete(runId);
        return;
      }

      const run = runRepository.findById(runId);
      if (!run || (run.status !== "running" && run.status !== "queued")) {
        this.activeLoops.delete(runId);
        return;
      }

      void this.advanceRun(runId)
        .then(() => setTimeout(advance, STEP_DURATION_MS))
        .catch(() => this.activeLoops.delete(runId));
    };

    setTimeout(advance, STEP_DURATION_MS);
  }

  createRun(payload: { scenarioId?: string }): ApiRun {
    const scenario = payload.scenarioId
      ? scenarioRepository.findById(payload.scenarioId)
      : scenarioRepository.getDefault();
    if (!scenario) throw notFound("Scenario not found");

    const run = runRepository.create(scenario, "queued");
    recordExecutionLog({
      runId: run.id,
      event: "run.created",
      status: run.status,
      details: { scenarioId: scenario.id },
    });
    runEventService.publish(
      run.id,
      "run.created",
      { scenarioId: scenario.id, workflow: scenario.title },
      `evt_${run.id}_created`,
    );
    return run;
  }

  async startRun(runId: string): Promise<ApiRunStatus> {
    const run = runRepository.findById(runId);
    if (!run) throw notFound("Run not found");
    if (run.status === "completed") throw badRequest("Completed runs must be replayed.");
    if (run.status === "waiting_for_approval") return this.getRunStatus(runId);
    if (run.status === "running") return this.getRunStatus(runId);

    const scenario = this.getScenarioForRun(run);
    const now = new Date().toISOString();
    runRepository.resetExecution(runId, scenario);
    const resetRun = runRepository.updateLifecycle(runId, {
      status: "running",
      currentStepId: "user",
      started: "just now",
      startedAt: now,
      completedAt: null,
      cancelledAt: null,
    });

    orchestrator.initialize(resetRun ?? run, scenario);

    recordExecutionLog({
      runId,
      event: "run.started",
      status: "running",
      details: { scenarioId: scenario.id, engine: "orchestrator" },
    });
    runEventService.publish(
      runId,
      "run.started",
      { scenarioId: scenario.id, currentStepId: "user" },
      `evt_${runId}_started`,
    );

    // Kick off proactive server-side execution loop so SSE subscribers
    // receive step events without needing to poll getRunStatus.
    this.scheduleExecution(runId, scenario);

    return this.getRunStatus(runId);
  }

  async cancelRun(runId: string): Promise<ApiRunStatus> {
    const run = runRepository.findById(runId);
    if (!run) throw notFound("Run not found");

    this.activeLoops.delete(runId); // stop proactive loop
    runRepository.updateLifecycle(runId, {
      status: "cancelled",
      currentStepId: null,
      cancelledAt: new Date().toISOString(),
    });

    recordExecutionLog({ runId, event: "run.cancelled", status: "cancelled" });
    return this.getRunStatus(runId);
  }

  async replayRun(runId: string): Promise<ApiRunStatus> {
    const run = runRepository.findById(runId);
    if (!run) throw notFound("Run not found");
    const replay = this.createRun({ scenarioId: run.scenarioId });
    recordExecutionLog({
      runId: replay.id,
      event: "run.replayed",
      status: replay.status,
      details: { sourceRunId: runId },
    });
    return this.startRun(replay.id);
  }

  async getRunStatus(runId: string): Promise<ApiRunStatus> {
    await this.advanceRun(runId);

    const run = runRepository.findById(runId);
    if (!run) throw notFound("Run not found");
    const steps = runRepository.listSteps(runId);
    const artifactReady = Boolean(artifactRepository.findForRun(runId));

    return {
      run,
      steps,
      traceCount: traceRepository.countForRun(runId),
      artifactReady,
    };
  }

  async approveApproval(approvalId: string, reviewerNote?: string): Promise<ApiRunStatus> {
    const approval = approvalService.approve(approvalId, reviewerNote);
    const run = runRepository.findById(approval.runId);
    if (!run) throw notFound("Run not found");
    const scenario = this.getScenarioForRun(run);

    this.appendApprovalTrace(run.id, {
      message: `Approval granted for ${approval.requestedAction}. Execution resumed and final artifact publishing is allowed.`,
      tone: "success",
      cost: 0,
      latencyMs: 120,
    });
    runEventService.publish(
      run.id,
      "approval.approved",
      {
        approvalId,
        requestedAction: approval.requestedAction,
        reviewerNote: reviewerNote ?? null,
      },
      `evt_${approvalId}_approved`,
    );

    await this.completeRun(run, scenario);
    recordExecutionLog({
      runId: run.id,
      event: "approval.approved",
      status: "completed",
      details: { approvalId, reviewerNote: reviewerNote ?? null },
    });

    return this.getRunStatus(run.id);
  }

  async rejectApproval(approvalId: string, reviewerNote?: string): Promise<ApiRunStatus> {
    const approval = approvalService.reject(approvalId, reviewerNote);
    const run = runRepository.findById(approval.runId);
    if (!run) throw notFound("Run not found");

    const now = new Date().toISOString();
    runRepository.updateStep(run.id, approval.stepId, {
      status: "failed",
      completedAt: now,
    });
    runRepository.updateLifecycle(run.id, {
      status: "rejected",
      currentStepId: approval.stepId,
      completedAt: now,
    });
    this.appendApprovalTrace(run.id, {
      message: `Approval rejected for ${approval.requestedAction}. Run stopped before final artifact release.`,
      tone: "warn",
      cost: 0,
      latencyMs: 90,
    });
    runEventService.publish(
      run.id,
      "approval.rejected",
      {
        approvalId,
        requestedAction: approval.requestedAction,
        reviewerNote: reviewerNote ?? null,
      },
      `evt_${approvalId}_rejected`,
    );
    runEventService.publishStatus({ ...run, status: "rejected", currentStepId: approval.stepId });
    runEventService.publish(
      run.id,
      "run.failed",
      { status: "rejected", currentStepId: approval.stepId },
      `evt_${run.id}_rejected`,
    );

    recordExecutionLog({
      runId: run.id,
      event: "approval.rejected",
      status: "rejected",
      details: { approvalId, reviewerNote: reviewerNote ?? null },
    });

    return this.getRunStatus(run.id);
  }

  getRunContext(runId: string) {
    const run = runRepository.findById(runId);
    if (!run) throw notFound("Run not found");
    return (
      orchestrator.getContext(runId) ?? orchestrator.initialize(run, this.getScenarioForRun(run))
    );
  }

  getRunAgents(runId: string) {
    const run = runRepository.findById(runId);
    if (!run) throw notFound("Run not found");
    return {
      runId,
      activeAgent: orchestrator.getContext(runId)?.metadata.activeAgent ?? null,
      agents: orchestrator.listAgents(),
    };
  }

  getRunHandoffs(runId: string) {
    const run = runRepository.findById(runId);
    if (!run) throw notFound("Run not found");
    return orchestrator.getHandoffs(runId);
  }

  listExecutionLogs() {
    return getExecutionLogs();
  }

  private async advanceRun(runId: string) {
    const run = runRepository.findById(runId);
    if (!run) throw notFound("Run not found");
    if (run.status !== "running") return;

    const lifecycle = runRepository.getLifecycleMetadata(runId);
    if (!lifecycle?.startedAt) return;

    const scenario = this.getScenarioForRun(run);
    const startedAt = new Date(lifecycle.startedAt).getTime();
    const elapsed = Math.max(0, Date.now() - startedAt);
    const totalDuration = scenario.steps.length * STEP_DURATION_MS;

    if (elapsed >= totalDuration) {
      const approval = approvalService.ensureBeforeFinalArtifact(run, scenario);
      if (approval?.status === "pending") {
        await this.pauseForApproval(run, scenario, approval.id);
        return;
      }
      await this.completeRun(run, scenario);
      return;
    }

    const activeIndex = Math.min(scenario.steps.length - 1, Math.floor(elapsed / STEP_DURATION_MS));
    const activeStep = scenario.steps[activeIndex];
    const now = new Date().toISOString();
    const snapshot = await orchestrator.advance(run, scenario, activeIndex);
    runEventService.publish(
      runId,
      "step.started",
      { stepId: activeStep.id, label: activeStep.label, agent: activeStep.agent },
      `evt_${runId}_step_started_${activeStep.id}`,
    );
    runEventService.publish(
      runId,
      "agent.started",
      { stepId: activeStep.id, agent: activeStep.agent || "User" },
      `evt_${runId}_agent_started_${activeStep.id}`,
    );

    scenario.steps.forEach((step, index) => {
      runRepository.updateStep(runId, step.id, {
        status: index < activeIndex ? "completed" : index === activeIndex ? "running" : "pending",
        startedAt: index <= activeIndex ? lifecycle.startedAt : null,
        completedAt: index < activeIndex ? now : null,
      });
      if (index < activeIndex) {
        runEventService.publish(
          runId,
          "step.completed",
          { stepId: step.id, label: step.label, agent: step.agent },
          `evt_${runId}_step_completed_${step.id}`,
        );
        runEventService.publish(
          runId,
          "agent.completed",
          { stepId: step.id, agent: step.agent || "User" },
          `evt_${runId}_agent_completed_${step.id}`,
        );
      }
    });

    traceRepository.replaceForRun(runId, snapshot.traces);
    runEventService.publishTraceEvidence(runId, snapshot.traces);

    const updatedRun = runRepository.updateLifecycle(runId, {
      status: "running",
      currentStepId: activeStep.id,
      tokens: Math.round(
        (scenario.costSummary.totalTokens / scenario.steps.length) * (activeIndex + 1),
      ),
      cost: Number(
        ((scenario.costSummary.totalCost / scenario.steps.length) * (activeIndex + 1)).toFixed(2),
      ),
      costSummary: {
        ...scenario.costSummary,
        runId,
        totalTokens: Math.round(
          (scenario.costSummary.totalTokens / scenario.steps.length) * (activeIndex + 1),
        ),
        totalCost: Number(
          ((scenario.costSummary.totalCost / scenario.steps.length) * (activeIndex + 1)).toFixed(2),
        ),
      },
    });
    if (updatedRun) runEventService.publishStatus(updatedRun);

    recordExecutionLog({
      runId,
      event: "orchestrator.progressed",
      status: "running",
      details: {
        currentStepId: activeStep.id,
        activeAgent: snapshot.activeAgent,
        averageConfidence: snapshot.averageConfidence,
      },
    });
  }

  private async completeRun(run: ApiRun, scenario: DemoScenario) {
    const now = new Date().toISOString();
    const snapshot = await orchestrator.complete(run, scenario);

    scenario.steps.forEach((step) => {
      runRepository.updateStep(run.id, step.id, {
        status: "completed",
        startedAt: runRepository.getLifecycleMetadata(run.id)?.startedAt ?? now,
        completedAt: now,
      });
    });

    const approvalTrace = (traceRepository.listForRun(run.id) ?? []).filter(
      (event) => event.agent === "Human Approval Gate",
    );
    traceRepository.replaceForRun(run.id, [...snapshot.traces, ...approvalTrace]);

    const artifactMarkdown = orchestrator.getFinalMarkdown(snapshot.context, scenario);
    artifactRepository.upsertForRun({
      ...scenario.finalArtifact,
      runId: run.id,
      markdown: artifactMarkdown,
    });

    const completedRun = runRepository.updateLifecycle(run.id, {
      status: "completed",
      currentStepId: null,
      duration: scenario.executionRecord.duration,
      tokens: scenario.costSummary.totalTokens,
      cost: scenario.costSummary.totalCost,
      costSummary: { ...scenario.costSummary, runId: run.id },
      finalArtifact: {
        runId: run.id,
        title: scenario.finalArtifact.title,
        filename: scenario.finalArtifact.filename,
        sizeLabel: scenario.finalArtifact.sizeLabel,
        status: scenario.finalArtifact.status,
        approvedBy: scenario.finalArtifact.approvedBy,
      },
      completedAt: now,
    });
    runEventService.publishTraceEvidence(run.id, snapshot.traces);
    runEventService.publish(
      run.id,
      "artifact.updated",
      {
        title: scenario.finalArtifact.title,
        filename: scenario.finalArtifact.filename,
        status: scenario.finalArtifact.status,
      },
      `evt_${run.id}_artifact_updated`,
    );
    runEventService.publish(
      run.id,
      "run.completed",
      { status: "completed", artifact: scenario.finalArtifact.filename },
      `evt_${run.id}_completed`,
    );
    if (completedRun) runEventService.publishStatus(completedRun);
    if (completedRun) evalService.generateForRun(completedRun);

    recordExecutionLog({
      runId: run.id,
      event: "orchestrator.completed",
      status: "completed",
      details: {
        artifact: scenario.finalArtifact.filename,
        handoffs: snapshot.handoffs.length,
        averageConfidence: snapshot.averageConfidence,
      },
    });
  }

  private async pauseForApproval(run: ApiRun, scenario: DemoScenario, approvalId: string) {
    const now = new Date().toISOString();
    const reviewerIndex = Math.max(
      0,
      scenario.steps.findIndex((step) => step.id === "reviewer"),
    );
    const snapshot = await orchestrator.advance(run, scenario, reviewerIndex);
    const trace = [
      ...snapshot.traces,
      this.createApprovalTrace(run.id, {
        message:
          "Approval requested before publishing the final artifact. Human reviewer must approve or reject this release.",
        tone: "warn",
        cost: 0,
        latencyMs: 160,
      }),
    ];

    scenario.steps.forEach((step, index) => {
      runRepository.updateStep(run.id, step.id, {
        status: index <= reviewerIndex ? "completed" : "pending",
        startedAt: runRepository.getLifecycleMetadata(run.id)?.startedAt ?? now,
        completedAt: index <= reviewerIndex ? now : null,
      });
    });

    traceRepository.replaceForRun(run.id, trace);
    const updatedRun = runRepository.updateLifecycle(run.id, {
      status: "waiting_for_approval",
      currentStepId: "reviewer",
      started: "waiting for approval",
      tokens: Math.round(scenario.costSummary.totalTokens * 0.9),
      cost: Number((scenario.costSummary.totalCost * 0.9).toFixed(2)),
      costSummary: {
        ...scenario.costSummary,
        runId: run.id,
        totalTokens: Math.round(scenario.costSummary.totalTokens * 0.9),
        totalCost: Number((scenario.costSummary.totalCost * 0.9).toFixed(2)),
      },
    });
    runEventService.publishTraceEvidence(run.id, trace);
    runEventService.publish(
      run.id,
      "approval.requested",
      { approvalId, currentStepId: "reviewer" },
      `evt_${approvalId}_requested`,
    );
    if (updatedRun) runEventService.publishStatus(updatedRun, run.status);

    recordExecutionLog({
      runId: run.id,
      event: "approval.requested",
      status: "waiting_for_approval",
      details: { approvalId, currentStepId: "reviewer" },
    });
  }

  private appendApprovalTrace(
    runId: string,
    options: Pick<TraceEvent, "message" | "tone"> & Partial<Pick<TraceEvent, "latencyMs" | "cost">>,
  ) {
    const currentTrace = traceRepository.listForRun(runId) ?? [];
    traceRepository.replaceForRun(runId, [
      ...currentTrace,
      this.createApprovalTrace(runId, options),
    ]);
  }

  private createApprovalTrace(
    runId: string,
    options: Pick<TraceEvent, "message" | "tone"> & Partial<Pick<TraceEvent, "latencyMs" | "cost">>,
  ): TraceEvent {
    return {
      id: `trace_${runId}_approval_${Date.now()}`,
      runId,
      stepId: "reviewer",
      ts: new Date().toISOString(),
      agent: "Human Approval Gate",
      message: options.message,
      tone: options.tone,
      type: "review",
      latencyMs: options.latencyMs,
      cost: options.cost,
    };
  }

  private getScenarioForRun(run: ApiRun): DemoScenario {
    const scenario = scenarioRepository.findById(run.scenarioId);
    if (!scenario) throw notFound("Scenario not found");
    return scenario;
  }
}

export const workflowExecutionService = new WorkflowExecutionService();
