import type { TraceEvent } from "@/lib/demo/types";
import { asc, eq } from "drizzle-orm";
import { initializeDatabase } from "../db";
import { db } from "../db/connection";
import { traceEventsTable } from "../db/schema";

export class TraceRepository {
  listForRun(runId: string): TraceEvent[] | undefined {
    initializeDatabase();
    const rows = db
      .select()
      .from(traceEventsTable)
      .where(eq(traceEventsTable.runId, runId))
      .orderBy(asc(traceEventsTable.sequence))
      .all();

    if (rows.length === 0) return undefined;

    return rows.map((row) => ({
      id: row.id,
      runId: row.runId,
      stepId: row.stepId as TraceEvent["stepId"],
      ts: row.ts,
      agent: row.agent,
      message: row.message,
      tone: row.tone,
      type: row.type,
      latencyMs: row.latencyMs ?? undefined,
      cost: row.cost ?? undefined,
      toolCallId: row.toolCallId ?? undefined,
    }));
  }

  replaceForRun(runId: string, events: TraceEvent[]) {
    const now = new Date().toISOString();
    db.transaction((tx) => {
      tx.delete(traceEventsTable).where(eq(traceEventsTable.runId, runId)).run();
      if (events.length === 0) return;
      tx.insert(traceEventsTable)
        .values(
          events.map((event, index) => ({
            id: event.id,
            runId: event.runId,
            stepId: event.stepId,
            sequence: index,
            ts: event.ts,
            agent: event.agent,
            message: event.message,
            tone: event.tone,
            type: event.type,
            latencyMs: event.latencyMs ?? null,
            cost: event.cost ?? null,
            toolCallId: event.toolCallId ?? null,
            createdAt: now,
          })),
        )
        .run();
    });
  }

  countForRun(runId: string) {
    return this.listForRun(runId)?.length ?? 0;
  }
}

export const traceRepository = new TraceRepository();
