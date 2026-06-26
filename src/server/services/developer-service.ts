import type { RegisteredRoute } from "../types/api";
import { getRequestLogs } from "../utils/logger";

export class DeveloperService {
  listRoutes(routes: RegisteredRoute[]) {
    return routes;
  }

  listLogs() {
    return getRequestLogs();
  }
}

export const developerService = new DeveloperService();
