import { z } from "zod";

import { BaseTool } from "../BaseTool";

const endpointSchema = z.object({
  path: z.string(),
  method: z.string(),
  summary: z.string().optional(),
  description: z.string().optional(),
  auth: z.string().optional(),
});

const inputSchema = z.object({
  endpoints: z.array(endpointSchema).optional(),
  openapi: z.record(z.unknown()).optional(),
});

const outputSchema = z.object({
  endpoints: z.array(
    z.object({
      path: z.string(),
      method: z.string(),
      documented: z.boolean(),
    }),
  ),
  methods: z.array(z.string()),
  missingDocs: z.array(z.string()),
  authNotes: z.array(z.string()),
});

export class OpenApiInspectorTool extends BaseTool<typeof inputSchema, typeof outputSchema> {
  id = "openapi-inspector";
  name = "OpenAPI Inspector";
  description =
    "Inspects OpenAPI-like endpoint definitions for methods, missing docs, and auth notes.";
  category = "inspection" as const;
  inputSchema = inputSchema;
  outputSchema = outputSchema;

  protected run(input: z.infer<typeof inputSchema>) {
    const endpoints = input.endpoints ?? extractOpenApiEndpoints(input.openapi ?? {});
    const normalized = endpoints.map((endpoint) => ({
      path: endpoint.path,
      method: endpoint.method.toUpperCase(),
      documented: Boolean(endpoint.summary || endpoint.description),
    }));

    return {
      endpoints: normalized,
      methods: Array.from(new Set(normalized.map((endpoint) => endpoint.method))).sort(),
      missingDocs: normalized
        .filter((endpoint) => !endpoint.documented)
        .map((endpoint) => `${endpoint.method} ${endpoint.path}`),
      authNotes: endpoints
        .map((endpoint) => endpoint.auth)
        .filter((note): note is string => Boolean(note)),
    };
  }
}

function extractOpenApiEndpoints(openapi: Record<string, unknown>) {
  const paths = typeof openapi.paths === "object" && openapi.paths ? openapi.paths : {};
  return Object.entries(paths as Record<string, Record<string, unknown>>).flatMap(
    ([path, methods]) =>
      Object.entries(methods).map(([method, config]) => {
        const value =
          typeof config === "object" && config ? (config as Record<string, unknown>) : {};
        return {
          path,
          method,
          summary: typeof value.summary === "string" ? value.summary : undefined,
          description: typeof value.description === "string" ? value.description : undefined,
          auth: Array.isArray(value.security) ? "Security requirement present." : undefined,
        };
      }),
  );
}
