import { z } from "zod";
import {
  costSummarySchema,
  createRunRequestSchema,
  finalArtifactSchema,
  runSchema,
  scenarioSummarySchema,
  traceEventSchema,
} from "@/lib/api/schemas";

export {
  costSummarySchema,
  createRunRequestSchema,
  finalArtifactSchema,
  runSchema,
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
  timestamp: z.string(),
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
