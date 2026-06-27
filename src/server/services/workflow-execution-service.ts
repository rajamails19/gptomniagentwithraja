import type { ApiRun, ApiRunStatus } from "@/lib/api/schemas";
import type { DemoScenario } from "@/lib/demo/types";
import { artifactRepository } from "../repositories/artifact-repository";
import { runRepository } from "../repositories/run-repository";
import { scenarioRepository } from "../repositories/scenario-repository";
import { traceRepository } from "../repositories/trace-repository";
import { orchestrator } from "../orchestrator/Orchestrator";
import { badRequest, notFound } from "../utils/errors";
import { getExecutionLogs, recordExecutionLog } from "../utils/execution-logger";

const STEP_DURATION_MS = 900;

export class WorkflowExecutionService {
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
    return run;
  }

  async startRun(runId: string): Promise<ApiRunStatus> {
    const run = runRepository.findById(runId);
    if (!run) throw notFound("Run not found");
    if (run.status === "completed") throw badRequest("Completed runs must be replayed.");
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

    return this.getRunStatus(runId);
  }

  async cancelRun(runId: string): Promise<ApiRunStatus> {
    const run = runRepository.findById(runId);
    if (!run) throw notFound("Run not found");

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
      await this.completeRun(run, scenario);
      return;
    }

    const activeIndex = Math.min(scenario.steps.length - 1, Math.floor(elapsed / STEP_DURATION_MS));
    const activeStep = scenario.steps[activeIndex];
    const now = new Date().toISOString();
    const snapshot = await orchestrator.advance(run, scenario, activeIndex);

    scenario.steps.forEach((step, index) => {
      runRepository.updateStep(runId, step.id, {
        status: index < activeIndex ? "completed" : index === activeIndex ? "running" : "pending",
        startedAt: index <= activeIndex ? lifecycle.startedAt : null,
        completedAt: index < activeIndex ? now : null,
      });
    });

    traceRepository.replaceForRun(runId, snapshot.traces);

    runRepository.updateLifecycle(runId, {
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

    traceRepository.replaceForRun(run.id, snapshot.traces);

    const artifactMarkdown = orchestrator.getFinalMarkdown(snapshot.context, scenario);
    artifactRepository.upsertForRun({
      ...scenario.finalArtifact,
      runId: run.id,
      markdown: artifactMarkdown,
    });

    runRepository.updateLifecycle(run.id, {
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

  private getScenarioForRun(run: ApiRun): DemoScenario {
    const scenario = scenarioRepository.findById(run.scenarioId);
    if (!scenario) throw notFound("Scenario not found");
    return scenario;
  }
}

export const workflowExecutionService = new WorkflowExecutionService();
