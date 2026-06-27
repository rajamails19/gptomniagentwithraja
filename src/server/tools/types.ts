import type { z } from "zod";

export type ToolCategory = "inspection" | "generation" | "risk" | "cost" | "trace";

export type ToolExecutionContext = {
  runId?: string;
  traceEventId?: string;
};

export type ToolExecutionResult<TOutput> = {
  output: TOutput;
  durationMs: number;
};

export type RegisteredTool = {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  inputSchema: z.ZodTypeAny;
  outputSchema: z.ZodTypeAny;
  execute(input: unknown, context?: ToolExecutionContext): Promise<unknown> | unknown;
};

export type ToolSummary = {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
};

export type ToolExecutionLog = {
  id: string;
  runId: string | null;
  traceEventId: string | null;
  toolId: string;
  inputSummary: string;
  outputSummary: string;
  status: "success" | "error";
  durationMs: number;
  error: string | null;
  createdAt: string;
};
