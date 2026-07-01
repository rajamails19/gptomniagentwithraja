import type { ApiRoute } from "../../types/api";
import { guardrailService } from "../../services/guardrail-service";
import { json } from "../../utils/http";
import {
  guardrailPoliciesResponseSchema,
  guardrailsResponseSchema,
} from "../../validation/schemas";

export const guardrailRoutes: ApiRoute[] = [
  {
    method: "GET",
    path: "/api/v1/guardrails",
    summary: "Return guardrail policy posture, enforcement summary, and recent eval evidence.",
    handler: ({ requestId }) => {
      const data = guardrailsResponseSchema.parse(guardrailService.getOverview());
      return json(data, requestId);
    },
  },
  {
    method: "GET",
    path: "/api/v1/guardrails/policies",
    summary: "List persisted guardrail policy definitions.",
    handler: ({ requestId }) => {
      const data = guardrailPoliciesResponseSchema.parse({
        policies: guardrailService.listPolicies(),
      });
      return json(data, requestId);
    },
  },
];
