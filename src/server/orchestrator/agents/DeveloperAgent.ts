import type { AgentDefinition, AgentExecutionContext } from "../ExecutionState";

export class DeveloperAgent implements AgentDefinition {
  id = "developer";
  name = "Developer Agent";
  role = "Transforms research into a structured draft artifact.";
  systemPrompt =
    "You are a senior developer agent. Convert evidence into implementation-ready technical content.";
  allowedTools = ["markdown-generator"];
  allowedModels = ["gpt-5-mini", "gpt-5"];

  async execute(context: AgentExecutionContext) {
    const started = performance.now();
    const tool = await context.runTool(
      "markdown-generator",
      {
        title: "Payments API Documentation",
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
    const markdown =
      typeof tool.output === "object" && tool.output && "markdown" in tool.output
        ? String(tool.output.markdown)
        : "";

    return {
      agentId: this.id,
      stepId: "code" as const,
      status: "completed" as const,
      summary: "Developer created the first structured draft from research output.",
      output: markdown,
      artifacts: { draftMarkdown: markdown },
      toolOutputs: { "markdown-generator": tool.output },
      traceEvents: [
        {
          id: `${context.runId}-developer-draft`,
          runId: context.runId,
          stepId: "code",
          ts: "00:03:00",
          agent: this.name,
          message: "Developer transformed research evidence into a structured markdown draft.",
          tone: "success",
          type: "tool_result",
          latencyMs: 1480,
          cost: 0.18,
          toolCallId: "tool_draft",
        },
      ],
      confidence: 89,
      latencyMs: Math.max(1480, Math.round(performance.now() - started)),
      cost: 0.18,
    };
  }

  confidence() {
    return 89;
  }

  health() {
    return { status: "healthy" as const, averageLatencyMs: 1480, successRate: 97, retryCount: 0 };
  }
}
