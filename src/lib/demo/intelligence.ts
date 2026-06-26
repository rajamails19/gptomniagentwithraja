import type { DemoRun, ToolCall, WorkflowStepRun } from "./types";

export const AGENT_PHASES = [
  "Thinking...",
  "Planning...",
  "Calling Tool...",
  "Waiting for Response...",
  "Reviewing Result...",
  "Saving Memory...",
  "Handing Off...",
  "Completed",
] as const;

export function getAgentPhaseIndex(step: WorkflowStepRun): number {
  if (step.status === "pending") return 0;
  if (step.status === "running") return Math.max(1, Math.min(6, (step.order % 6) + 1));
  return AGENT_PHASES.length - 1;
}

export function getAgentScores(step: WorkflowStepRun) {
  const base = 88 + ((step.order * 3) % 9);
  const retryPenalty = step.status === "retried" ? 7 : 0;
  return {
    confidence: Math.max(76, base - retryPenalty),
    risk: step.status === "retried" ? "Medium" : step.cost > 0.6 ? "Medium" : "Low",
    quality: Math.max(82, base + 1 - retryPenalty),
    toolReliability: step.status === "retried" ? 84 : 96 - (step.order % 4),
  };
}

export function getMemoryUsage(step: WorkflowStepRun) {
  const retrieved = step.memoryContext.slice(0, 3);
  return {
    retrieved,
    newMemories:
      step.kind === "output" ? ["artifact_registry_entry"] : [`${step.id}:execution_summary`],
    updatedMemories:
      step.status === "completed" || step.status === "retried"
        ? [`${step.id}:last_successful_run`]
        : [],
    skippedMemories:
      step.kind === "input" ? ["restricted_customer_context"] : ["expired_context_chunks"],
  };
}

export function getDecisionCards(run: DemoRun) {
  const retryStep = run.stepRuns.find((step) => step.status === "retried");
  return [
    {
      title: "Planner model route",
      body: "Planner selected GPT-4o for structured decomposition, low temperature routing, and reliable JSON planning.",
    },
    {
      title: "Specialist handoff",
      body: `${run.stepRuns[2]?.agent ?? "Research Agent"} was selected because this scenario requires source-grounded context before generation.`,
    },
    {
      title: "Artifact model choice",
      body: `${run.stepRuns[4]?.agent ?? "Documentation Agent"} used ${run.stepRuns[4]?.model ?? "Claude"} for long-context synthesis and concise artifact drafting.`,
    },
    {
      title: retryStep ? "Retry decision" : "Retry budget held",
      body: retryStep
        ? `Retry happened because ${retryStep.label} exceeded a tool budget; the orchestrator recovered with deterministic backoff.`
        : "No retry was required; the orchestrator kept the retry budget unused for this run.",
    },
    {
      title: "QA gate",
      body: "QA approved because required checks passed and the artifact stayed inside policy, privacy, and quality constraints.",
    },
  ];
}

export function getAgentConversation(run: DemoRun) {
  return run.stepRuns
    .filter((step) => step.agent !== "—")
    .map((step) => ({
      agent: step.agent,
      message:
        step.status === "pending"
          ? `Waiting for upstream handoff for ${step.label.toLowerCase()}.`
          : step.status === "running"
            ? `I'm working on ${step.label.toLowerCase()} and validating evidence.`
            : `Completed ${step.label.toLowerCase()}: ${step.outputSummary}`,
    }));
}

export function getToolEvidence(toolCalls: ToolCall[], step: WorkflowStepRun): ToolCall[] {
  return toolCalls.filter((tool) => tool.stepId === step.id);
}

export function getExecutionSummary(run: DemoRun) {
  const retries = run.stepRuns.filter((step) => step.status === "retried").length;
  const agentsUsed = new Set(
    run.stepRuns.filter((step) => step.agent !== "—").map((step) => step.agent),
  );
  return {
    agentsUsed: agentsUsed.size,
    toolCalls: run.toolCalls.length,
    executionTime: run.duration,
    totalCost: `$${run.costSummary.totalCost.toFixed(2)}`,
    retries,
    quality: retries > 0 ? "94%" : "97%",
    finalStatus: run.finalArtifact.status === "approved" ? "Approved" : "Draft",
  };
}
