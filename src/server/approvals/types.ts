import type {
  ApiApprovalRequest,
  ApiApprovalRiskLevel,
  ApiApprovalStatus,
  ApiRun,
} from "@/lib/api/schemas";

export type ApprovalRequest = ApiApprovalRequest;
export type ApprovalStatus = ApiApprovalStatus;
export type ApprovalRiskLevel = ApiApprovalRiskLevel;

export type ApprovalCreateInput = {
  runId: string;
  scenarioId: string;
  agentId: string | null;
  stepId: NonNullable<ApiRun["currentStepId"]>;
  reason: string;
  riskLevel: ApprovalRiskLevel;
  requestedAction: string;
  artifactPreview: string;
};

export type ApprovalPolicyDecision =
  | {
      required: true;
      agentId: string | null;
      stepId: NonNullable<ApiRun["currentStepId"]>;
      reason: string;
      riskLevel: ApprovalRiskLevel;
      requestedAction: string;
      artifactPreview: string;
    }
  | { required: false };
