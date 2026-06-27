import type { AgentExecutionResult } from "./ExecutionState";

export class RetryManager {
  shouldRetry(result: AgentExecutionResult, attempts: number) {
    return result.status === "failed" && Boolean(result.retryable) && attempts < 1;
  }

  shouldEscalate(result: AgentExecutionResult, attempts: number) {
    return result.status === "failed" && attempts >= 1;
  }
}

export const retryManager = new RetryManager();
