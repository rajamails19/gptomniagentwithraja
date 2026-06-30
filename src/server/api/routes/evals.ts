import type { ApiRoute } from "../../types/api";
import { evalService } from "../../services/eval-service";
import { json, validateParams } from "../../utils/http";
import { evalResponseSchema, evalsResponseSchema, idParamSchema } from "../../validation/schemas";

export const evalRoutes: ApiRoute[] = [
  {
    method: "GET",
    path: "/api/v1/evals",
    summary: "List persisted eval reports generated from completed workflow runs.",
    handler: ({ requestId }) => {
      const data = evalsResponseSchema.parse({ reports: evalService.listReports() });
      return json(data, requestId);
    },
  },
  {
    method: "GET",
    path: "/api/v1/runs/:id/eval",
    summary: "Get the persisted eval report for one workflow run.",
    handler: ({ params, requestId }) => {
      const { id } = validateParams(params, idParamSchema);
      const data = evalResponseSchema.parse({ report: evalService.getReportForRun(id) });
      return json(data, requestId);
    },
  },
];
