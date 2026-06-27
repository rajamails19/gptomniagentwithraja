import { ZodError } from "zod";

import { toolExecutionRepository } from "../repositories/tool-execution-repository";
import { badRequest } from "../utils/errors";
import { toolRegistry } from "./ToolRegistry";
import type { ToolExecutionContext } from "./types";

export class ToolExecutor {
  async execute(toolId: string, input: unknown, context: ToolExecutionContext = {}) {
    const tool = toolRegistry.get(toolId);
    const started = performance.now();

    try {
      const output = await tool.execute(input, context);
      const durationMs = Math.round(performance.now() - started);
      const execution = toolExecutionRepository.create({
        runId: context.runId,
        traceEventId: context.traceEventId,
        toolId,
        inputSummary: summarize(input),
        outputSummary: summarize(output),
        status: "success",
        durationMs,
      });

      return {
        toolExecutionId: execution.id,
        toolId,
        output,
        durationMs,
        status: "success" as const,
      };
    } catch (error) {
      const durationMs = Math.round(performance.now() - started);
      const message =
        error instanceof ZodError
          ? "Tool input/output validation failed."
          : error instanceof Error
            ? error.message
            : "Tool execution failed.";

      const execution = toolExecutionRepository.create({
        runId: context.runId,
        traceEventId: context.traceEventId,
        toolId,
        inputSummary: summarize(input),
        outputSummary: "",
        status: "error",
        durationMs,
        error: message,
      });

      if (error instanceof ZodError) throw badRequest(message, error.flatten());
      throw badRequest(message, { toolExecutionId: execution.id });
    }
  }
}

export const toolExecutor = new ToolExecutor();

function summarize(value: unknown) {
  const serialized = typeof value === "string" ? value : JSON.stringify(value);
  if (!serialized) return "";
  return serialized.length > 420 ? `${serialized.slice(0, 417)}...` : serialized;
}
