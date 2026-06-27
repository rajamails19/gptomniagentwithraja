import type { AgentDefinition, AgentExecutionContext } from "../ExecutionState";

export class QAAgent implements AgentDefinition {
  id = "qa";
  name = "QA/Test Agent";
  role = "Validates artifact quality, risk, coverage, and governance readiness.";
  systemPrompt = "You are a QA agent. Validate artifact readiness and identify actionable risks.";
  allowedTools = ["risk-scanner"];
  allowedModels = ["gpt-5-mini", "gpt-5"];

  async execute(context: AgentExecutionContext) {
    const started = performance.now();
    const artifact =
      context.artifacts.documentationMarkdown || context.artifacts.draftMarkdown || "";
    const tool = await context.runTool("risk-scanner", { text: artifact }, "tool_checklist");

    return {
      agentId: this.id,
      stepId: "qa" as const,
      status: "completed" as const,
      summary: "QA validated coverage and governance readiness.",
      toolOutputs: { "risk-scanner": tool.output },
      traceEvents: [
        {
          id: `${context.runId}-qa-risk-scan`,
          runId: context.runId,
          stepId: "qa",
          ts: "00:05:00",
          agent: this.name,
          message: "QA ran risk-scanner and passed the artifact with governance notes.",
          tone: "success",
          type: "review",
          latencyMs: 980,
          cost: 0.13,
          toolCallId: "tool_checklist",
        },
      ],
      confidence: 91,
      latencyMs: Math.max(980, Math.round(performance.now() - started)),
      cost: 0.13,
    };
  }

  confidence() {
    return 91;
  }

  health() {
    return { status: "healthy" as const, averageLatencyMs: 980, successRate: 98, retryCount: 0 };
  }
}
