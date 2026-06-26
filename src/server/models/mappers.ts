import type { ApiRun, ApiScenario } from "@/lib/api/schemas";
import type { DemoScenario, TraceEvent } from "@/lib/demo/types";

export type StoredRun = ApiRun & {
  trace: TraceEvent[];
  artifactMarkdown: string;
};

export function toApiScenario(scenario: DemoScenario): ApiScenario {
  return {
    id: scenario.id,
    title: scenario.title,
    goal: scenario.goal,
    description: scenario.description,
    businessObjective: scenario.businessObjective,
    initialUserRequest: scenario.initialUserRequest,
    plannerOutput: scenario.plannerOutput,
    presentationFocus: scenario.presentationFocus,
    successMetrics: scenario.successMetrics,
    costSummary: scenario.costSummary,
    finalArtifact: {
      runId: scenario.finalArtifact.runId,
      title: scenario.finalArtifact.title,
      filename: scenario.finalArtifact.filename,
      sizeLabel: scenario.finalArtifact.sizeLabel,
      status: scenario.finalArtifact.status,
      approvedBy: scenario.finalArtifact.approvedBy,
    },
  };
}

export function toPublicRun(run: StoredRun): ApiRun {
  const { trace: _trace, artifactMarkdown: _artifactMarkdown, ...publicRun } = run;
  void _trace;
  void _artifactMarkdown;
  return publicRun;
}

export function createTrace(scenario: DemoScenario, runId: string): TraceEvent[] {
  return scenario.steps.flatMap((step, stepIndex) =>
    scenario.stepMessages[step.id].map((message, messageIndex) => ({
      id: `${runId}-${step.id}-${messageIndex + 1}`,
      runId,
      stepId: step.id,
      ts: `00:${String(stepIndex).padStart(2, "0")}:${String(messageIndex * 8).padStart(2, "0")}`,
      agent: step.agent,
      message: message.msg,
      tone: message.tone,
      type: message.type ?? "status",
      latencyMs: message.latencyMs,
      cost: message.cost,
      toolCallId: message.toolCallId,
    })),
  );
}
