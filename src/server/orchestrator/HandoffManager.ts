import type { DemoNodeId } from "@/lib/demo/types";
import type { HandoffRecord } from "./ExecutionState";

export class HandoffManager {
  create(params: {
    runId: string;
    sequence: number;
    fromAgent: string;
    toAgent: string;
    stepId: DemoNodeId;
    message: string;
    confidence: number;
    latencyMs: number;
  }): HandoffRecord {
    return {
      id: `${params.runId}-handoff-${params.sequence}`,
      runId: params.runId,
      sequence: params.sequence,
      fromAgent: params.fromAgent,
      toAgent: params.toAgent,
      stepId: params.stepId,
      message: params.message,
      confidence: params.confidence,
      latencyMs: params.latencyMs,
      createdAt: new Date().toISOString(),
    };
  }
}

export const handoffManager = new HandoffManager();
