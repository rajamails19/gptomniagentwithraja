import type { ApiMemory, ApiMemoryScope } from "@/lib/api/schemas";
import type { DemoNodeId, WorkflowStep } from "@/lib/demo/types";

export type MemoryScope = ApiMemoryScope;
export type MemoryRecord = ApiMemory;

export interface MemoryQuery {
  scope?: MemoryScope;
  runId?: string;
  scenarioId?: string;
  agentId?: string;
  tags?: string[];
  limit?: number;
}

export interface MemoryWriteInput {
  scope: MemoryScope;
  runId?: string | null;
  scenarioId?: string | null;
  agentId?: string | null;
  content: string;
  tags: string[];
  importance: number;
  source: string;
}

export interface MemoryRetrievalContext {
  runId: string;
  scenarioId: string;
  agentId: string;
  step: WorkflowStep;
}

export interface MemoryStepResult {
  retrieved: MemoryRecord[];
  written: MemoryRecord[];
  memoryIds: string[];
}

export interface MemoryWriteContext {
  runId: string;
  scenarioId: string;
  agentId: string;
  stepId: DemoNodeId;
  stepLabel: string;
  summary: string;
}
