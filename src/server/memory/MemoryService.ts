import type { ApiMemory, CreateMemoryRequest, UpdateMemoryRequest } from "@/lib/api/schemas";
import { notFound } from "../utils/errors";
import { recordExecutionLog } from "../utils/execution-logger";
import { memoryPolicy } from "./MemoryPolicy";
import { memoryRepository } from "./MemoryRepository";
import { memoryRetriever } from "./MemoryRetriever";
import { memorySummarizer } from "./MemorySummarizer";
import type { MemoryRetrievalContext, MemoryStepResult, MemoryWriteContext } from "./types";

export class MemoryService {
  listMemories(query: Parameters<typeof memoryRepository.list>[0] = {}) {
    return memoryRepository.list(query);
  }

  getMemory(id: string) {
    const memory = memoryRepository.findById(id);
    if (!memory) throw notFound("Memory not found");
    return memory;
  }

  createMemory(input: CreateMemoryRequest) {
    const sanitized = memoryPolicy.sanitize({
      scope: input.scope,
      runId: input.runId,
      scenarioId: input.scenarioId,
      agentId: input.agentId,
      content: input.content,
      tags: input.tags,
      importance: input.importance,
      source: input.source,
    });
    return memoryRepository.create(sanitized);
  }

  updateMemory(id: string, input: UpdateMemoryRequest) {
    const existing = this.getMemory(id);
    const sanitized = memoryPolicy.sanitize({
      scope: input.scope ?? existing.scope,
      runId: input.runId === undefined ? existing.runId : input.runId,
      scenarioId: input.scenarioId === undefined ? existing.scenarioId : input.scenarioId,
      agentId: input.agentId === undefined ? existing.agentId : input.agentId,
      content: input.content ?? existing.content,
      tags: input.tags ?? existing.tags,
      importance: input.importance ?? existing.importance,
      source: input.source ?? existing.source,
    });
    const memory = memoryRepository.update(id, sanitized);
    if (!memory) throw notFound("Memory not found");
    return memory;
  }

  deleteMemory(id: string) {
    if (!memoryRepository.delete(id)) throw notFound("Memory not found");
    return { deleted: true };
  }

  listForRun(runId: string) {
    return memoryRepository.list({ runId });
  }

  listForScenario(scenarioId: string) {
    return memoryRepository.list({ scenarioId });
  }

  prepareForAgent(context: MemoryRetrievalContext): ApiMemory[] {
    const relevant = memoryRepository.listRelevant(context);
    return memoryRetriever.rank(relevant, context);
  }

  recordAgentMemory(context: MemoryWriteContext, retrieved: ApiMemory[] = []): MemoryStepResult {
    const writeInputs = [
      memorySummarizer.summarizeAgentResult(context),
      ...(context.agentId === "reviewer" || context.agentId === "qa"
        ? [memorySummarizer.workflowMemory(context)]
        : []),
    ];
    const written = writeInputs
      .filter((input) => memoryPolicy.isAllowed(input))
      .map((input) => memoryRepository.create(memoryPolicy.sanitize(input)));

    const memoryIds = [...retrieved, ...written].map((memory) => memory.id);
    recordExecutionLog({
      runId: context.runId,
      event: "memory.agent.updated",
      status: "success",
      details: {
        agentId: context.agentId,
        stepId: context.stepId,
        retrieved: retrieved.length,
        written: written.length,
      },
    });
    return { retrieved, written, memoryIds };
  }
}

export const memoryService = new MemoryService();
