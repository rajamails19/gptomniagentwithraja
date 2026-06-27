import type { DemoScenario } from "@/lib/demo/types";
import type { ApiRun } from "@/lib/api/schemas";
import { createInitialExecutionContext, type ExecutionContextState } from "./ExecutionState";

export class ExecutionContextFactory {
  create(run: ApiRun, scenario: DemoScenario): ExecutionContextState {
    return createInitialExecutionContext(run, scenario);
  }

  merge(
    context: ExecutionContextState,
    patch: Partial<ExecutionContextState>,
  ): ExecutionContextState {
    const updatedAt = new Date().toISOString();
    return {
      ...context,
      ...patch,
      metadata: {
        ...context.metadata,
        ...patch.metadata,
        updatedAt,
      },
      artifacts: {
        ...context.artifacts,
        ...patch.artifacts,
      },
      toolOutputs: {
        ...context.toolOutputs,
        ...patch.toolOutputs,
      },
      trace: patch.trace ?? context.trace,
      handoffs: patch.handoffs ?? context.handoffs,
    };
  }
}

export const executionContextFactory = new ExecutionContextFactory();
