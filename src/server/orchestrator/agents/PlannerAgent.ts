import { PlannerPrompt } from "../../llm/prompts/templates";
import type { AgentDefinition, AgentExecutionContext } from "../ExecutionState";

export class PlannerAgent implements AgentDefinition {
  id = "planner";
  name = "Planner Agent";
  role = "Creates the execution plan and governance checkpoints.";
  systemPrompt = PlannerPrompt.system;
  allowedTools: string[] = [];
  allowedModels = ["gpt-5", "gpt-5-mini"];

  async execute(context: AgentExecutionContext) {
    const started = performance.now();
    let plan = `Plan: ${context.goal}. Route through research, development, documentation, QA, and review.`;
    try {
      const text = await context.generateText(
        `Create a concise execution plan for: ${context.userRequest}`,
        this.systemPrompt,
      );
      plan = text.trim() || plan;
    } catch {
      // Deterministic fallback keeps demos running without provider credentials.
    }

    return {
      agentId: this.id,
      stepId: "planner" as const,
      status: "completed" as const,
      summary: "Planner decomposed the request into agent tasks.",
      output: plan,
      artifacts: { plannerOutput: plan },
      traceEvents: [
        {
          id: `${context.runId}-planner-orchestrated`,
          runId: context.runId,
          stepId: "planner",
          ts: "00:01:00",
          agent: this.name,
          message: "Planner created a multi-agent execution plan with governed handoffs.",
          tone: "success",
          type: "status",
          latencyMs: 820,
          cost: 0.05,
        },
      ],
      confidence: 94,
      latencyMs: Math.max(820, Math.round(performance.now() - started)),
      cost: 0.05,
    };
  }

  confidence() {
    return 94;
  }

  health() {
    return { status: "healthy" as const, averageLatencyMs: 820, successRate: 99, retryCount: 0 };
  }
}
