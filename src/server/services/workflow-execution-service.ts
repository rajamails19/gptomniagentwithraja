import type { ApiRun, ApiRunStatus } from "@/lib/api/schemas";
import { DEFAULT_SCENARIO_ID } from "@/lib/demo/seed-data";
import type { DemoNodeId, DemoScenario } from "@/lib/demo/types";
import { llmService } from "../llm/LLMService";
import { DeveloperPrompt } from "../llm/prompts/templates";
import { createTrace } from "../models/mappers";
import { artifactRepository } from "../repositories/artifact-repository";
import { runRepository } from "../repositories/run-repository";
import { scenarioRepository } from "../repositories/scenario-repository";
import { traceRepository } from "../repositories/trace-repository";
import { toolExecutionRepository } from "../repositories/tool-execution-repository";
import { toolExecutor } from "../tools/ToolExecutor";
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

    await this.runStepTools(run, scenario, activeStep.id);

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

  private async completeRun(run: ApiRun, scenario: DemoScenario) {
    const now = new Date().toISOString();
    scenario.steps.forEach((step) => {
      runRepository.updateStep(run.id, step.id, {
        status: "completed",
        startedAt: runRepository.getLifecycleMetadata(run.id)?.startedAt ?? now,
        completedAt: now,
      });
    });

    traceRepository.replaceForRun(run.id, createTrace(scenario, run.id));
    await this.runStepTools(run, scenario, "research");
    await this.runStepTools(run, scenario, "docs");
    await this.runStepTools(run, scenario, "qa");
    await this.runStepTools(run, scenario, "final");

    const artifactMarkdown = await this.generateFinalArtifact(run, scenario);
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
      event: "run.completed",
      status: "completed",
      details: { artifact: scenario.finalArtifact.filename },
    });
  }

  private async generateFinalArtifact(run: ApiRun, scenario: DemoScenario) {
    if (scenario.id !== DEFAULT_SCENARIO_ID) return scenario.finalArtifact.markdown;

    try {
      const result = await llmService.generate({
        system: DeveloperPrompt.system,
        prompt: DeveloperPrompt.user(scenario),
        executionId: run.id,
        metadata: {
          scenarioId: scenario.id,
          workflow: scenario.title,
        },
      });

      recordExecutionLog({
        runId: run.id,
        event: "llm.artifact.generated",
        status: "completed",
        details: {
          provider: result.provider,
          model: result.model,
          latencyMs: result.latencyMs,
          totalTokens: result.usage?.totalTokens,
        },
      });

      return result.text.trim() || scenario.finalArtifact.markdown;
    } catch (error) {
      recordExecutionLog({
        runId: run.id,
        event: "llm.artifact.fallback",
        status: "completed",
        details: {
          reason: error instanceof Error ? error.message : "LLM unavailable",
        },
      });
      return scenario.finalArtifact.markdown;
    }
  }

  private async runStepTools(run: ApiRun, scenario: DemoScenario, stepId: DemoNodeId) {
    if (scenario.id !== DEFAULT_SCENARIO_ID) return;

    const existing = toolExecutionRepository.listForRun(run.id);
    const executeOnce = async (toolId: string, input: unknown, traceEventId: string) => {
      if (
        existing.some(
          (execution) => execution.toolId === toolId && execution.traceEventId === traceEventId,
        )
      ) {
        return;
      }
      try {
        const result = await toolExecutor.execute(toolId, input, {
          runId: run.id,
          traceEventId,
        });
        recordExecutionLog({
          runId: run.id,
          event: "tool.executed",
          status: "running",
          details: { toolId, durationMs: result.durationMs },
        });
      } catch (error) {
        recordExecutionLog({
          runId: run.id,
          event: "tool.failed",
          status: "running",
          details: {
            toolId,
            reason: error instanceof Error ? error.message : "Tool execution failed",
          },
        });
      }
    };

    if (stepId === "research") {
      await executeOnce(
        "openapi-inspector",
        {
          endpoints: [
            {
              method: "POST",
              path: "/payments/intents",
              summary: "Create a PaymentIntent",
              auth: "Bearer token required",
            },
            {
              method: "GET",
              path: "/payments/intents/:id",
              summary: "Retrieve a PaymentIntent",
              auth: "Bearer token required",
            },
            {
              method: "POST",
              path: "/payments/refunds",
              summary: "Refund a captured charge",
              auth: "Bearer token required",
            },
            {
              method: "POST",
              path: "/payments/disputes/:id/evidence",
              summary: "Submit dispute evidence",
              auth: "Bearer token required",
            },
          ],
        },
        "tool_research",
      );
    }

    if (stepId === "docs") {
      await executeOnce(
        "markdown-generator",
        {
          title: scenario.finalArtifact.title,
          bulletPoints: [
            "Base URL documented",
            "Auth and idempotency covered",
            "Error table included",
          ],
          sections: [
            {
              heading: "Overview",
              body: "Client-ready Payments API documentation generated from inspected endpoint evidence.",
            },
            {
              heading: "Endpoints",
              bullets: [
                "POST /payments/intents",
                "GET /payments/intents/:id",
                "POST /payments/refunds",
              ],
            },
          ],
        },
        "tool_draft",
      );
    }

    if (stepId === "qa") {
      await executeOnce(
        "risk-scanner",
        {
          text: scenario.finalArtifact.markdown,
        },
        "tool_checklist",
      );
    }

    if (stepId === "final") {
      await executeOnce(
        "trace-summarizer",
        {
          traceEvents: traceRepository.listForRun(run.id) ?? [],
        },
        "tool_summary",
      );
    }
  }

  private getScenarioForRun(run: ApiRun): DemoScenario {
    const scenario = scenarioRepository.findById(run.scenarioId);
    if (!scenario) throw notFound("Scenario not found");
    return scenario;
  }
}

export const workflowExecutionService = new WorkflowExecutionService();
