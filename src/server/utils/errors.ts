import { ZodError } from "zod";

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function notFound(message = "Resource not found") {
  return new ApiError(404, "NOT_FOUND", message);
}

export function badRequest(message: string, details?: unknown) {
  return new ApiError(400, "BAD_REQUEST", message, details);
}

export function methodNotAllowed(message = "Method not allowed") {
  return new ApiError(405, "METHOD_NOT_ALLOWED", message);
}

export function routeNotFound() {
  return new ApiError(404, "ROUTE_NOT_FOUND", "API route not found");
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof ZodError) {
    return badRequest("Request validation failed", error.flatten());
  }
  return new ApiError(500, "INTERNAL_ERROR", "API request failed");
}
