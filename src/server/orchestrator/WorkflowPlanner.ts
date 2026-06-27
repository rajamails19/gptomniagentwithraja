import type { DemoNodeId, DemoScenario } from "@/lib/demo/types";
import { STEP_AGENT_SEQUENCE } from "./ExecutionState";

export class WorkflowPlanner {
  plan(scenario: DemoScenario) {
    return scenario.steps.map((step) => {
      const mapped = STEP_AGENT_SEQUENCE.find((item) => item.stepId === step.id);
      return {
        stepId: step.id as DemoNodeId,
        agentId: mapped?.agentId ?? "planner",
        label: step.label,
        description: step.description,
      };
    });
  }

  getAgentForStep(stepId: DemoNodeId) {
    return STEP_AGENT_SEQUENCE.find((item) => item.stepId === stepId)?.agentId ?? "planner";
  }
}

export const workflowPlanner = new WorkflowPlanner();
