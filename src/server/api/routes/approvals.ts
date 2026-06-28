import type { ApiRoute } from "../../types/api";
import { approvalService } from "../../approvals/ApprovalService";
import { workflowExecutionService } from "../../services/workflow-execution-service";
import { json, parseJsonBody, validateParams } from "../../utils/http";
import {
  approvalDecisionRequestSchema,
  approvalResponseSchema,
  approvalsResponseSchema,
  idParamSchema,
  runStatusResponseSchema,
} from "../../validation/schemas";

export const approvalRoutes: ApiRoute[] = [
  {
    method: "GET",
    path: "/api/v1/runs/:id/approvals",
    summary: "List human approval requests for one workflow run.",
    handler: ({ params, requestId }) => {
      const { id } = validateParams(params, idParamSchema);
      const data = approvalsResponseSchema.parse({ approvals: approvalService.listForRun(id) });
      return json(data, requestId);
    },
  },
  {
    method: "GET",
    path: "/api/v1/approvals",
    summary: "List human approval gates across workflow runs.",
    handler: ({ requestId }) => {
      const data = approvalsResponseSchema.parse({ approvals: approvalService.listApprovals() });
      return json(data, requestId);
    },
  },
  {
    method: "GET",
    path: "/api/v1/approvals/:id",
    summary: "Get one human approval request.",
    handler: ({ params, requestId }) => {
      const { id } = validateParams(params, idParamSchema);
      const data = approvalResponseSchema.parse({ approval: approvalService.getApproval(id) });
      return json(data, requestId);
    },
  },
  {
    method: "POST",
    path: "/api/v1/approvals/:id/approve",
    summary: "Approve a pending human approval request and resume the run.",
    handler: async ({ params, request, requestId }) => {
      const { id } = validateParams(params, idParamSchema);
      const payload = await parseJsonBody(request, approvalDecisionRequestSchema);
      const data = runStatusResponseSchema.parse(
        await workflowExecutionService.approveApproval(id, payload.reviewerNote),
      );
      return json(data, requestId);
    },
  },
  {
    method: "POST",
    path: "/api/v1/approvals/:id/reject",
    summary: "Reject a pending human approval request and stop the run before release.",
    handler: async ({ params, request, requestId }) => {
      const { id } = validateParams(params, idParamSchema);
      const payload = await parseJsonBody(request, approvalDecisionRequestSchema);
      const data = runStatusResponseSchema.parse(
        await workflowExecutionService.rejectApproval(id, payload.reviewerNote),
      );
      return json(data, requestId);
    },
  },
];
