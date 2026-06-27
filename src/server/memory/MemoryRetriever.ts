import type { MemoryRecord, MemoryRetrievalContext } from "./types";

export class MemoryRetriever {
  rank(memories: MemoryRecord[], context: MemoryRetrievalContext) {
    const tags = new Set([context.step.id, context.agentId, ...context.step.memoryContext]);
    return [...memories]
      .map((memory) => ({
        memory,
        score:
          memory.importance +
          memory.tags.filter((tag) => tags.has(tag)).length * 16 +
          (memory.agentId === context.agentId ? 10 : 0) +
          (memory.runId === context.runId ? 8 : 0),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((item) => item.memory);
  }
}

export const memoryRetriever = new MemoryRetriever();
