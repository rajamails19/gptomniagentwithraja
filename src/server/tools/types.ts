import type { z } from "zod";

export type ToolCategory = "inspection" | "generation" | "risk" | "cost" | "trace" | "mcp";

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
  origin?: {
    type: "local" | "mcp";
    serverId?: string;
  };
  execute(input: unknown, context?: ToolExecutionContext): Promise<unknown> | unknown;
};

export type ToolSummary = {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  origin?: {
    type: "local" | "mcp";
    serverId?: string;
  };
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
