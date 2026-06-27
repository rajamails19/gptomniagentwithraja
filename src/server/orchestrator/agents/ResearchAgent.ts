import { ResearchPrompt } from "../../llm/prompts/templates";
import type { AgentDefinition, AgentExecutionContext } from "../ExecutionState";

export class ResearchAgent implements AgentDefinition {
  id = "research";
  name = "Research Agent";
  role = "Collects structured source evidence and API surface details.";
  systemPrompt = ResearchPrompt.system;
  allowedTools = ["openapi-inspector"];
  allowedModels = ["gpt-5-mini", "gpt-5"];

  async execute(context: AgentExecutionContext) {
    const started = performance.now();
    const tool = await context.runTool(
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

    return {
      agentId: this.id,
      stepId: "research" as const,
      status: "completed" as const,
      summary: "Research gathered API evidence and auth notes.",
      toolOutputs: { "openapi-inspector": tool.output },
      traceEvents: [
        {
          id: `${context.runId}-research-tool-call`,
          runId: context.runId,
          stepId: "research",
          ts: "00:02:00",
          agent: this.name,
          message: "Research called openapi-inspector with scoped endpoint evidence.",
          tone: "info",
          type: "tool_call",
          latencyMs: tool.durationMs,
          toolCallId: "tool_research",
        },
        {
          id: `${context.runId}-research-tool-result`,
          runId: context.runId,
          stepId: "research",
          ts: "00:02:08",
          agent: this.name,
          message: "Research assembled documented endpoints, auth notes, and missing-docs checks.",
          tone: "success",
          type: "tool_result",
          latencyMs: 1280,
          cost: 0.12,
          toolCallId: "tool_research",
        },
      ],
      confidence: 92,
      latencyMs: Math.max(1280, Math.round(performance.now() - started)),
      cost: 0.12,
    };
  }

  confidence() {
    return 92;
  }

  health() {
    return { status: "healthy" as const, averageLatencyMs: 1280, successRate: 98, retryCount: 0 };
  }
}
