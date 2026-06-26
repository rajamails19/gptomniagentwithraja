import type { z } from "zod";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type RouteParams = Record<string, string>;

export type ApiRequestContext = {
  request: Request;
  url: URL;
  requestId: string;
  params: RouteParams;
};

export type ApiRoute = {
  method: HttpMethod;
  path: string;
  summary: string;
  handler: (context: ApiRequestContext) => Promise<Response> | Response;
};

export type RegisteredRoute = Pick<ApiRoute, "method" | "path" | "summary">;

export type ApiSuccess<T> = {
  success: true;
  data: T;
  timestamp: string;
  requestId: string;
};

export type ApiFailure = {
  success: false;
  code: string;
  message: string;
  details?: unknown;
  timestamp: string;
  requestId: string;
};

export type SchemaInput<TSchema extends z.ZodTypeAny> = z.input<TSchema>;
