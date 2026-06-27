import { z } from "zod";

import { BaseTool } from "../BaseTool";

const traceEventSchema = z.object({
  agent: z.string(),
  message: z.string(),
  tone: z.string().optional(),
  type: z.string().optional(),
});

const inputSchema = z.object({
  traceEvents: z.array(traceEventSchema),
});

const outputSchema = z.object({
  summary: z.string(),
  agents: z.array(z.string()),
  eventCount: z.number(),
  warnings: z.number(),
});

export class TraceSummarizerTool extends BaseTool<typeof inputSchema, typeof outputSchema> {
  id = "trace-summarizer";
  name = "Trace Summarizer";
  description = "Summarizes trace events into an executive-readable execution summary.";
  category = "trace" as const;
  inputSchema = inputSchema;
  outputSchema = outputSchema;

  protected run(input: z.infer<typeof inputSchema>) {
    const agents = Array.from(new Set(input.traceEvents.map((event) => event.agent))).filter(
      (agent) => agent && agent !== "—",
    );
    const warnings = input.traceEvents.filter(
      (event) => event.tone === "warn" || event.tone === "error" || event.type === "retry",
    ).length;

    return {
      summary: `${input.traceEvents.length} trace events across ${agents.length} agents. ${warnings} warning or retry events detected.`,
      agents,
      eventCount: input.traceEvents.length,
      warnings,
    };
  }
}
