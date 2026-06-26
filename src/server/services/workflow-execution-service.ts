import type { ApiRun, ApiRunStatus } from "@/lib/api/schemas";
import type { DemoNodeId, DemoScenario } from "@/lib/demo/types";
import { createTrace } from "../models/mappers";
import { artifactRepository } from "../repositories/artifact-repository";
import { runRepository } from "../repositories/run-repository";
import { scenarioRepository } from "../repositories/scenario-repository";
import { traceRepository } from "../repositories/trace-repository";
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

  startRun(runId: string): ApiRunStatus {
    const run = runRepository.findById(runId);
    if (!run) throw notFound("Run not found");
    if (run.status === "completed") throw badRequest("Completed runs must be replayed.");
    if (run.status === "running") return this.getRunStatus(runId);

    const scenario = this.getScenarioForRun(run);
    const now = new Date().toISOString();
    runRepository.resetExecution(runId, scenario);
    runRepository.updateLifecycle(runId, {
      status: "running",
      currentStepId: "user",
      started: "just now",
      startedAt: now,
      completedAt: null,
      cancelledAt: null,
    });

    recordExecutionLog({
      runId,
      event: "run.started",
      status: "running",
      details: { scenarioId: scenario.id },
    });

    return this.getRunStatus(runId);
  }

  cancelRun(runId: string): ApiRunStatus {
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

  replayRun(runId: string): ApiRunStatus {
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

  getRunStatus(runId: string): ApiRunStatus {
    this.advanceRun(runId);

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

  listExecutionLogs() {
    return getExecutionLogs();
  }

  private advanceRun(runId: string) {
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
      this.completeRun(run, scenario);
      return;
    }

    const activeIndex = Math.min(scenario.steps.length - 1, Math.floor(elapsed / STEP_DURATION_MS));
    const activeStep = scenario.steps[activeIndex];
    const now = new Date().toISOString();

    scenario.steps.forEach((step, index) => {
      runRepository.updateStep(runId, step.id, {
        status: index < activeIndex ? "completed" : index === activeIndex ? "running" : "pending",
        startedAt: index <= activeIndex ? lifecycle.startedAt : null,
        completedAt: index < activeIndex ? now : null,
      });
    });

    traceRepository.replaceForRun(
      runId,
      createTrace(scenario, runId).filter((event) => {
        const stepIndex = scenario.steps.findIndex((step) => step.id === event.stepId);
        return stepIndex >= 0 && stepIndex <= activeIndex;
      }),
    );

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
      event: "run.progressed",
      status: "running",
      details: { currentStepId: activeStep.id },
    });
  }

  private completeRun(run: ApiRun, scenario: DemoScenario) {
    const now = new Date().toISOString();
    scenario.steps.forEach((step) => {
      runRepository.updateStep(run.id, step.id, {
        status: "completed",
        startedAt: runRepository.getLifecycleMetadata(run.id)?.startedAt ?? now,
        completedAt: now,
      });
    });

    traceRepository.replaceForRun(run.id, createTrace(scenario, run.id));
    artifactRepository.upsertForRun({
      ...scenario.finalArtifact,
      runId: run.id,
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
      event: "run.completed",
      status: "completed",
      details: { artifact: scenario.finalArtifact.filename },
    });
  }

  private getScenarioForRun(run: ApiRun): DemoScenario {
    const scenario = scenarioRepository.findById(run.scenarioId);
    if (!scenario) throw notFound("Scenario not found");
    return scenario;
  }
}

export const workflowExecutionService = new WorkflowExecutionService();
