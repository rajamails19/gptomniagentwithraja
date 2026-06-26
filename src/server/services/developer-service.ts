import type { RegisteredRoute } from "../types/api";
import { workflowExecutionService } from "./workflow-execution-service";
import { getRequestLogs } from "../utils/logger";

export class DeveloperService {
  listRoutes(routes: RegisteredRoute[]) {
    return routes;
  }

  listLogs() {
    return getRequestLogs();
  }

  listExecutionLogs() {
    return workflowExecutionService.listExecutionLogs();
  }
}

export const developerService = new DeveloperService();
