import { z } from "zod";
import {
  costSummarySchema,
  createRunRequestSchema,
  finalArtifactSchema,
  runSchema,
  runStatusResponseSchema,
  scenarioSummarySchema,
  traceEventSchema,
} from "@/lib/api/schemas";

export {
  costSummarySchema,
  createRunRequestSchema,
  finalArtifactSchema,
  runSchema,
  runStatusResponseSchema,
  scenarioSummarySchema,
  traceEventSchema,
};

export const idParamSchema = z.object({
  id: z.string().min(1),
});

export const healthResponseSchema = z.object({
  ok: z.boolean(),
  service: z.string(),
  version: z.string(),
  mode: z.string(),
  scenarioCount: z.number(),
  runCount: z.number(),
  database: z.object({
    connected: z.boolean(),
    storageType: z.literal("sqlite"),
    path: z.string(),
    migrations: z.literal("applied"),
    seed: z.object({
      seeded: z.boolean(),
      scenarios: z.number(),
      runs: z.number(),
    }),
  }),
  llm: z.object({
    provider: z.string(),
    model: z.string(),
    configured: z.boolean(),
    reachable: z.boolean(),
    status: z.string(),
    message: z.string(),
  }),
  timestamp: z.string(),
});

export const llmTestRequestSchema = z.object({
  prompt: z.string().min(1).max(20_000),
  model: z.string().min(1).optional(),
  temperature: z.number().min(0).max(2).optional(),
});

export const llmTestResponseSchema = z.object({
  response: z.string(),
  latencyMs: z.number(),
  usage: z
    .object({
      inputTokens: z.number().optional(),
      outputTokens: z.number().optional(),
      totalTokens: z.number().optional(),
    })
    .optional(),
  provider: z.string(),
  model: z.string(),
});

export const scenariosResponseSchema = z.object({
  scenarios: z.array(scenarioSummarySchema),
});

export const scenarioResponseSchema = z.object({
  scenario: scenarioSummarySchema,
});

export const runsResponseSchema = z.object({
  runs: z.array(runSchema),
});

export const runResponseSchema = z.object({
  run: runSchema,
});

export const traceResponseSchema = z.object({
  trace: z.array(traceEventSchema),
});

export const artifactResponseSchema = z.object({
  artifact: finalArtifactSchema,
});
