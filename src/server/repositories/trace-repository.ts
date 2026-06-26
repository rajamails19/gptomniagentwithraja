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
}

export const traceRepository = new TraceRepository();
