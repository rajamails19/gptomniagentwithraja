import type { MemoryWriteContext, MemoryWriteInput } from "./types";

const agentTags: Record<string, string[]> = {
  planner: ["plan", "handoff"],
  research: ["research", "source"],
  developer: ["artifact", "implementation"],
  documentation: ["documentation", "artifact"],
  qa: ["qa", "validation"],
  reviewer: ["review", "approval"],
};

export class MemorySummarizer {
  summarizeAgentResult(context: MemoryWriteContext): MemoryWriteInput {
    const tags = [
      context.stepId,
      context.agentId,
      ...(agentTags[context.agentId] ?? ["agent"]),
      "demo",
    ];

    return {
      scope: "run",
      runId: context.runId,
      scenarioId: context.scenarioId,
      agentId: context.agentId,
      content: `${context.stepLabel}: ${context.summary}`,
      tags,
      importance: context.agentId === "reviewer" ? 86 : context.agentId === "qa" ? 78 : 70,
      source: "orchestrator.agent_summary",
    };
  }

  workflowMemory(context: MemoryWriteContext): MemoryWriteInput {
    return {
      scope: "workflow",
      runId: null,
      scenarioId: context.scenarioId,
      agentId: context.agentId,
      content: `${context.stepLabel} reusable note: ${context.summary}`,
      tags: [context.stepId, context.agentId, "workflow", "reusable"],
      importance: 58,
      source: "orchestrator.workflow_summary",
    };
  }
}

export const memorySummarizer = new MemorySummarizer();
