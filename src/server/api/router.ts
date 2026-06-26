import type { ApiRoute, RouteParams } from "../types/api";
import { jsonError } from "../utils/http";
import { createRequestId, recordRequestLog } from "../utils/logger";
import { methodNotAllowed, routeNotFound } from "../utils/errors";
import { apiRoutes } from "./routes";

type RouteMatch = {
  route: ApiRoute;
  params: RouteParams;
};

export async function handleApiRequest(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/")) return null;

  const requestId = createRequestId();
  const started = performance.now();
  let response: Response;
  let errorCode: string | undefined;
  let errorMessage: string | undefined;

  try {
    const match = matchRoute(request.method, url.pathname);
    if (!match) throw routeNotFound();
    if (match === "method-not-allowed") throw methodNotAllowed();

    response = await match.route.handler({
      request,
      url,
      requestId,
      params: match.params,
    });
  } catch (error) {
    response = jsonError(error, requestId);
    const body = await response
      .clone()
      .json()
      .catch(() => null);
    errorCode = typeof body?.code === "string" ? body.code : undefined;
    errorMessage = typeof body?.message === "string" ? body.message : undefined;
  }

  recordRequestLog({
    requestId,
    method: request.method,
    path: url.pathname,
    status: response.status,
    durationMs: Math.round(performance.now() - started),
    timestamp: new Date().toISOString(),
    errorCode,
    errorMessage,
  });

  response.headers.set("x-request-id", requestId);
  return response;
}

function matchRoute(method: string, pathname: string): RouteMatch | "method-not-allowed" | null {
  let pathExistsWithDifferentMethod = false;

  for (const route of apiRoutes) {
    const params = matchPath(route.path, pathname);
    if (!params) continue;
    if (route.method !== method) {
      pathExistsWithDifferentMethod = true;
      continue;
    }
    return { route, params };
  }

  return pathExistsWithDifferentMethod ? "method-not-allowed" : null;
}

function matchPath(routePath: string, pathname: string): RouteParams | null {
  const routeParts = routePath.split("/").filter(Boolean);
  const pathParts = pathname.split("/").filter(Boolean);
  if (routeParts.length !== pathParts.length) return null;

  const params: RouteParams = {};
  for (let index = 0; index < routeParts.length; index += 1) {
    const routePart = routeParts[index];
    const pathPart = pathParts[index];
    if (routePart.startsWith(":")) {
      params[routePart.slice(1)] = decodeURIComponent(pathPart);
      continue;
    }
    if (routePart !== pathPart) return null;
  }

  return params;
}
