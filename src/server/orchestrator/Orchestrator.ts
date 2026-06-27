import type { ApiRun } from "@/lib/api/schemas";
import type { DemoNodeId, DemoScenario, TraceEvent } from "@/lib/demo/types";
import { DEFAULT_SCENARIO_ID } from "@/lib/demo/seed-data";
import { orchestrationRepository } from "../repositories/orchestration-repository";
import { recordExecutionLog } from "../utils/execution-logger";
import { agentExecutor } from "./AgentExecutor";
import { agentRegistry } from "./AgentRegistry";
import { executionContextFactory } from "./ExecutionContext";
import type {
  AgentExecutionResult,
  ExecutionContextState,
  OrchestrationSnapshot,
} from "./ExecutionState";
import { STEP_AGENT_SEQUENCE } from "./ExecutionState";
import { handoffManager } from "./HandoffManager";
import { retryManager } from "./RetryManager";
import { workflowPlanner } from "./WorkflowPlanner";

export class Orchestrator {
  initialize(run: ApiRun, scenario: DemoScenario) {
    orchestrationRepository.reset(run.id);
    const context = executionContextFactory.create(run, scenario);
    orchestrationRepository.upsertContext(context);
    recordExecutionLog({
      runId: run.id,
      event: "orchestrator.initialized",
      status: run.status,
      details: { agents: agentRegistry.list().map((agent) => agent.id) },
    });
    return context;
  }

  listAgents() {
    return agentRegistry.list();
  }

  getContext(runId: string) {
    return orchestrationRepository.getContext(runId);
  }

  getHandoffs(runId: string) {
    return orchestrationRepository.listHandoffs(runId);
  }

  async advance(
    run: ApiRun,
    scenario: DemoScenario,
    activeIndex: number,
  ): Promise<OrchestrationSnapshot> {
    const existing = orchestrationRepository.getContext(run.id) ?? this.initialize(run, scenario);
    const plan = workflowPlanner.plan(scenario);
    const maxIndex = Math.min(activeIndex, plan.length - 1);
    let context = existing;

    for (let index = 0; index <= maxIndex; index += 1) {
      const step = plan[index];
      if (this.hasStepTrace(context, step.stepId)) continue;
      context = await this.executeStep(context, scenario, step.stepId, step.agentId, index);
    }

    const activeStepId = plan[maxIndex]?.stepId ?? "user";
    const activeAgentId = workflowPlanner.getAgentForStep(activeStepId);
    const activeAgent = activeAgentId === "user" ? "User" : agentRegistry.get(activeAgentId).name;
    const averageConfidence = this.averageConfidence(context);

    context = executionContextFactory.merge(context, {
      currentStep: activeStepId,
      currentAgent: activeAgent,
      metadata: {
        ...context.metadata,
        status: run.status,
        activeAgent,
        stage: plan[maxIndex]?.label ?? "Request received",
        averageConfidence,
        retryCount: context.trace.filter((event) => event.type === "retry").length,
      },
    });

    orchestrationRepository.upsertContext(context);
    orchestrationRepository.replaceHandoffs(run.id, context.handoffs);

    return {
      context,
      traces: context.trace,
      handoffs: context.handoffs,
      activeStepId,
      activeAgent,
      stage: context.metadata.stage,
      averageConfidence,
    };
  }

  async complete(run: ApiRun, scenario: DemoScenario): Promise<OrchestrationSnapshot> {
    const snapshot = await this.advance(run, scenario, scenario.steps.length - 1);
    const context = executionContextFactory.merge(snapshot.context, {
      currentStep: "final",
      currentAgent: "Reviewer Agent",
      metadata: {
        ...snapshot.context.metadata,
        status: "completed",
        activeAgent: "Reviewer Agent",
        stage: "Final Output",
        averageConfidence: snapshot.averageConfidence,
      },
    });
    orchestrationRepository.upsertContext(context);
    orchestrationRepository.replaceHandoffs(run.id, context.handoffs);
    return {
      ...snapshot,
      context,
      activeStepId: "final",
      activeAgent: "Reviewer Agent",
      stage: "Final Output",
    };
  }

  private async executeStep(
    context: ExecutionContextState,
    scenario: DemoScenario,
    stepId: DemoNodeId,
    agentId: string,
    index: number,
  ): Promise<ExecutionContextState> {
    if (stepId === "user" || agentId === "user") {
      const trace = [
        ...context.trace,
        {
          id: `${context.runId}-user-orchestrated`,
          runId: context.runId,
          stepId: "user",
          ts: "00:00:00",
          agent: "User",
          message: `Goal received: ${scenario.initialUserRequest}`,
          tone: "info",
          type: "status",
        } satisfies TraceEvent,
      ];
      return executionContextFactory.merge(context, {
        currentStep: "user",
        currentAgent: "User",
        trace,
      });
    }

    const agent = agentRegistry.get(agentId);
    let result: AgentExecutionResult;
    let attempts = 0;
    try {
      result = await agentExecutor.execute(agent, {
        ...context,
        currentStep: stepId,
        currentAgent: agent.name,
      });
    } catch (error) {
      result = this.failedResult(context.runId, stepId, agent.id, agent.name, error);
    }

    if (retryManager.shouldRetry(result, attempts)) {
      attempts += 1;
      result = await agentExecutor.execute(agent, {
        ...context,
        currentStep: stepId,
        currentAgent: agent.name,
      });
    }

    if (retryManager.shouldEscalate(result, attempts)) {
      const reviewer = agentRegistry.get("reviewer");
      result = await agentExecutor.execute(reviewer, {
        ...context,
        currentStep: "reviewer",
        currentAgent: reviewer.name,
      });
    }

    const previous = this.previousAgentName(index);
    const handoff = handoffManager.create({
      runId: context.runId,
      sequence: context.handoffs.length + 1,
      fromAgent: previous,
      toAgent: agent.name,
      stepId,
      message: `${previous} handed context to ${agent.name}: ${result.summary}`,
      confidence: result.confidence,
      latencyMs: result.latencyMs,
    });

    const handoffTrace: TraceEvent = {
      id: `${context.runId}-handoff-${handoff.sequence}`,
      runId: context.runId,
      stepId,
      ts: this.tsForIndex(index, 9),
      agent: "Orchestrator",
      message: handoff.message,
      tone: result.status === "failed" ? "error" : "success",
      type: "status",
      latencyMs: handoff.latencyMs,
    };

    const traces = [...context.trace, ...result.traceEvents, handoffTrace];
    const artifacts = { ...context.artifacts, ...result.artifacts };
    if (stepId === "docs" && !artifacts.documentationMarkdown) {
      artifacts.documentationMarkdown = scenario.finalArtifact.markdown;
    }

    const next = executionContextFactory.merge(context, {
      currentStep: stepId,
      currentAgent: agent.name,
      artifacts,
      toolOutputs: { ...context.toolOutputs, ...result.toolOutputs },
      trace: traces,
      handoffs: [...context.handoffs, handoff],
      metadata: {
        ...context.metadata,
        activeAgent: agent.name,
        stage: scenario.steps.find((step) => step.id === stepId)?.label ?? stepId,
        retryCount: traces.filter((event) => event.type === "retry").length,
        averageConfidence: this.averageConfidence({ ...context, trace: traces }),
      },
    });

    recordExecutionLog({
      runId: context.runId,
      event: "orchestrator.agent.completed",
      status: result.status,
      details: { agentId: agent.id, stepId, confidence: result.confidence },
    });

    return next;
  }

  private failedResult(
    runId: string,
    stepId: DemoNodeId,
    agentId: string,
    agentName: string,
    error: unknown,
  ): AgentExecutionResult {
    const message = error instanceof Error ? error.message : "Agent execution failed";
    return {
      agentId,
      stepId,
      status: "failed",
      summary: message,
      traceEvents: [
        {
          id: `${runId}-${stepId}-agent-error`,
          runId,
          stepId,
          ts: "00:00:00",
          agent: agentName,
          message,
          tone: "error",
          type: "retry",
          latencyMs: 0,
        },
      ],
      confidence: 40,
      latencyMs: 0,
      cost: 0,
      retryable: true,
    };
  }

  private hasStepTrace(context: ExecutionContextState, stepId: DemoNodeId) {
    return context.trace.some((event) => event.stepId === stepId);
  }

  private previousAgentName(index: number) {
    if (index <= 1) return "User";
    const previousAgentId = STEP_AGENT_SEQUENCE[index - 1]?.agentId;
    if (!previousAgentId || previousAgentId === "user") return "User";
    return agentRegistry.get(previousAgentId).name;
  }

  private tsForIndex(index: number, seconds = 0) {
    return `00:${String(index).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  private averageConfidence(context: ExecutionContextState) {
    const values = context.handoffs.map((handoff) => handoff.confidence);
    if (values.length === 0) return 0;
    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  }

  getFinalMarkdown(context: ExecutionContextState | undefined, scenario: DemoScenario) {
    if (scenario.id !== DEFAULT_SCENARIO_ID) return scenario.finalArtifact.markdown;
    return (
      context?.artifacts.finalMarkdown ||
      context?.artifacts.documentationMarkdown ||
      scenario.finalArtifact.markdown
    );
  }
}

export const orchestrator = new Orchestrator();
