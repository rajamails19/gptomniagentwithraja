import { z } from "zod";
import type { ApiFailure, ApiSuccess } from "../types/api";
import { toApiError } from "./errors";

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

export function json<T>(data: T, requestId: string, status = 200) {
  const payload: ApiSuccess<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
    requestId,
  };

  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: jsonHeaders,
  });
}

export function jsonError(error: unknown, requestId: string) {
  const apiError = toApiError(error);
  const payload: ApiFailure = {
    success: false,
    code: apiError.code,
    message: apiError.message,
    details: apiError.details,
    timestamp: new Date().toISOString(),
    requestId,
  };

  return new Response(JSON.stringify(payload, null, 2), {
    status: apiError.status,
    headers: jsonHeaders,
  });
}

export async function parseJsonBody<T extends z.ZodTypeAny>(
  request: Request,
  schema: T,
): Promise<z.infer<T>> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return schema.parse({});
  }

  const body = await request.json();
  return schema.parse(body);
}

export function validateParams<T extends z.ZodTypeAny>(
  params: Record<string, string>,
  schema: T,
): z.infer<T> {
  return schema.parse(params);
}
