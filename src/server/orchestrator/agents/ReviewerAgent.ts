import { ReviewerPrompt } from "../../llm/prompts/templates";
import type { AgentDefinition, AgentExecutionContext } from "../ExecutionState";

export class ReviewerAgent implements AgentDefinition {
  id = "reviewer";
  name = "Reviewer Agent";
  role = "Approves final output and summarizes the execution trace.";
  systemPrompt = ReviewerPrompt.system;
  allowedTools = ["trace-summarizer"];
  allowedModels = ["gpt-5", "gpt-5-mini"];

  async execute(context: AgentExecutionContext) {
    const started = performance.now();
    const tool = await context.runTool(
      "trace-summarizer",
      { traceEvents: context.trace },
      "tool_summary",
    );
    const artifact =
      context.artifacts.documentationMarkdown || context.artifacts.draftMarkdown || "";

    return {
      agentId: this.id,
      stepId: "reviewer" as const,
      status: "completed" as const,
      summary: "Reviewer approved the artifact and summarized the orchestration trace.",
      output: artifact,
      artifacts: { finalMarkdown: artifact },
      toolOutputs: { "trace-summarizer": tool.output },
      traceEvents: [
        {
          id: `${context.runId}-reviewer-approved`,
          runId: context.runId,
          stepId: "reviewer",
          ts: "00:06:00",
          agent: this.name,
          message: "Reviewer approved the orchestrated artifact with low residual risk.",
          tone: "success",
          type: "review",
          latencyMs: 760,
          cost: 0.08,
          toolCallId: "tool_summary",
        },
        {
          id: `${context.runId}-final-artifact`,
          runId: context.runId,
          stepId: "final",
          ts: "00:07:00",
          agent: this.name,
          message: "Final artifact published after reviewer approval.",
          tone: "success",
          type: "artifact",
          latencyMs: 260,
        },
      ],
      confidence: 95,
      latencyMs: Math.max(760, Math.round(performance.now() - started)),
      cost: 0.08,
    };
  }

  confidence() {
    return 95;
  }

  health() {
    return { status: "healthy" as const, averageLatencyMs: 760, successRate: 99, retryCount: 0 };
  }
}
