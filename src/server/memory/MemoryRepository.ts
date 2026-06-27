import { and, desc, eq, or } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import type { ApiMemory } from "@/lib/api/schemas";
import { initializeDatabase } from "../db";
import { db } from "../db/connection";
import { memoriesTable, type MemoryRow } from "../db/schema";
import type { MemoryQuery, MemoryWriteInput } from "./types";
import type { MemoryStore } from "./MemoryStore";

function toMemory(row: MemoryRow): ApiMemory {
  return {
    id: row.id,
    scope: row.scope,
    runId: row.runId,
    scenarioId: row.scenarioId,
    agentId: row.agentId,
    content: row.content,
    tags: JSON.parse(row.tagsJson) as string[],
    importance: row.importance,
    source: row.source,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class MemoryRepository implements MemoryStore {
  list(query: MemoryQuery = {}) {
    initializeDatabase();
    const filters = [
      query.scope ? eq(memoriesTable.scope, query.scope) : undefined,
      query.runId ? eq(memoriesTable.runId, query.runId) : undefined,
      query.scenarioId ? eq(memoriesTable.scenarioId, query.scenarioId) : undefined,
      query.agentId ? eq(memoriesTable.agentId, query.agentId) : undefined,
    ].filter(Boolean);

    const rows = db
      .select()
      .from(memoriesTable)
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(desc(memoriesTable.createdAt))
      .limit(query.limit ?? 200)
      .all();

    return rows.map(toMemory).filter((memory) => {
      if (!query.tags?.length) return true;
      return query.tags.some((tag) => memory.tags.includes(tag));
    });
  }

  listRelevant(query: { runId: string; scenarioId: string; agentId: string }) {
    initializeDatabase();
    return db
      .select()
      .from(memoriesTable)
      .where(
        or(
          eq(memoriesTable.scope, "global"),
          eq(memoriesTable.runId, query.runId),
          eq(memoriesTable.scenarioId, query.scenarioId),
          eq(memoriesTable.agentId, query.agentId),
        ),
      )
      .orderBy(desc(memoriesTable.importance), desc(memoriesTable.createdAt))
      .limit(50)
      .all()
      .map(toMemory);
  }

  findById(id: string) {
    initializeDatabase();
    const row = db.select().from(memoriesTable).where(eq(memoriesTable.id, id)).get();
    return row ? toMemory(row) : null;
  }

  create(input: MemoryWriteInput) {
    initializeDatabase();
    const now = new Date().toISOString();
    const row = {
      id: `mem_${randomUUID().slice(0, 8)}`,
      scope: input.scope,
      runId: input.runId ?? null,
      scenarioId: input.scenarioId ?? null,
      agentId: input.agentId ?? null,
      content: input.content,
      tagsJson: JSON.stringify(input.tags),
      importance: input.importance,
      source: input.source,
      createdAt: now,
      updatedAt: now,
    };
    db.insert(memoriesTable).values(row).run();
    return toMemory(row);
  }

  update(id: string, input: Partial<MemoryWriteInput>) {
    const existing = this.findById(id);
    if (!existing) return null;
    const updated = {
      scope: input.scope ?? existing.scope,
      runId: input.runId === undefined ? existing.runId : input.runId,
      scenarioId: input.scenarioId === undefined ? existing.scenarioId : input.scenarioId,
      agentId: input.agentId === undefined ? existing.agentId : input.agentId,
      content: input.content ?? existing.content,
      tagsJson: JSON.stringify(input.tags ?? existing.tags),
      importance: input.importance ?? existing.importance,
      source: input.source ?? existing.source,
      updatedAt: new Date().toISOString(),
    };
    db.update(memoriesTable).set(updated).where(eq(memoriesTable.id, id)).run();
    return this.findById(id);
  }

  delete(id: string) {
    initializeDatabase();
    const result = db.delete(memoriesTable).where(eq(memoriesTable.id, id)).run();
    return result.changes > 0;
  }
}

export const memoryRepository = new MemoryRepository();
