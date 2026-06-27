import type { ApiRun } from "@/lib/api/schemas";
import type { DemoScenario } from "@/lib/demo/types";
import type { ApprovalPolicyDecision } from "./types";

const APPROVAL_SCENARIOS = new Set([
  "api-docs-generation",
  "api-documentation-generation",
  "payments-api-docs",
]);

const COST_THRESHOLD = 1;

export class ApprovalPolicy {
  evaluateBeforeFinalArtifact(run: ApiRun, scenario: DemoScenario): ApprovalPolicyDecision {
    const scenarioEnabled =
      APPROVAL_SCENARIOS.has(scenario.id) || /api documentation|api docs/i.test(scenario.title);
    const highCost = scenario.costSummary.totalCost >= COST_THRESHOLD;

    if (!scenarioEnabled && !highCost) {
      return { required: false };
    }

    return {
      required: true,
      agentId: "reviewer",
      stepId: "reviewer",
      reason: highCost
        ? "Cost threshold and final artifact publishing require human review."
        : "Scenario policy requires human approval before publishing the final artifact.",
      riskLevel: highCost ? "medium" : "low",
      requestedAction: "Approve final artifact release",
      artifactPreview: [
        scenario.finalArtifact.title,
        scenario.finalArtifact.markdown.split("\n").find(Boolean) ??
          scenario.finalArtifact.filename,
      ]
        .filter(Boolean)
        .join(" - ")
        .slice(0, 700),
    };
  }
}

export const approvalPolicy = new ApprovalPolicy();
