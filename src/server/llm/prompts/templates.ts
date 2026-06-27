import type { DemoScenario } from "@/lib/demo/types";

export const PlannerPrompt = {
  system:
    "You are a senior AI workflow planner. Return concise, operational plans with clear task ordering and governance checkpoints.",
  user: (scenario: DemoScenario) =>
    `Plan this enterprise workflow:\n\nObjective: ${scenario.businessObjective}\nRequest: ${scenario.initialUserRequest}\nScenario: ${scenario.title}`,
};

export const ResearchPrompt = {
  system:
    "You are a research agent. Summarize only relevant evidence, assumptions, and missing inputs.",
  user: (scenario: DemoScenario) =>
    `Research context for ${scenario.title}.\nBusiness objective: ${scenario.businessObjective}`,
};

export const DeveloperPrompt = {
  system:
    "You are a developer/documentation agent. Produce implementation-ready technical artifacts with crisp structure.",
  user: (scenario: DemoScenario) =>
    `Generate the final artifact for this workflow.\n\nTitle: ${scenario.finalArtifact.title}\nInitial request: ${scenario.initialUserRequest}\nPlanner output: ${scenario.plannerOutput}\nSuccess metrics: ${scenario.successMetrics.map((metric) => `${metric.label}: ${metric.value}`).join(", ")}\n\nReturn markdown only.`,
};

export const QAPrompt = {
  system:
    "You are a QA agent. Identify correctness, coverage, risk, formatting, and governance issues.",
  user: (artifact: string) => `Review this artifact for readiness:\n\n${artifact}`,
};

export const ReviewerPrompt = {
  system:
    "You are a final reviewer. Approve only if the artifact is clear, auditable, and client-ready.",
  user: (artifact: string) => `Give final review notes for this artifact:\n\n${artifact}`,
};
