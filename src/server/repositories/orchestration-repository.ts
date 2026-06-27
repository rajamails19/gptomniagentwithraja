import { asc, eq } from "drizzle-orm";
import { initializeDatabase } from "../db";
import { db } from "../db/connection";
import { agentHandoffsTable, orchestrationContextsTable } from "../db/schema";
import type { ExecutionContextState, HandoffRecord } from "../orchestrator/ExecutionState";

export class OrchestrationRepository {
  constructor() {
    initializeDatabase();
  }

  upsertContext(context: ExecutionContextState) {
    const now = new Date().toISOString();
    db.insert(orchestrationContextsTable)
      .values({ runId: context.runId, payloadJson: JSON.stringify(context), updatedAt: now })
      .onConflictDoUpdate({
        target: orchestrationContextsTable.runId,
        set: { payloadJson: JSON.stringify(context), updatedAt: now },
      })
      .run();
    return context;
  }

  getContext(runId: string): ExecutionContextState | undefined {
    const row = db
      .select()
      .from(orchestrationContextsTable)
      .where(eq(orchestrationContextsTable.runId, runId))
      .get();
    return row ? (JSON.parse(row.payloadJson) as ExecutionContextState) : undefined;
  }

  replaceHandoffs(runId: string, handoffs: HandoffRecord[]) {
    db.transaction((tx) => {
      tx.delete(agentHandoffsTable).where(eq(agentHandoffsTable.runId, runId)).run();
      if (handoffs.length === 0) return;
      tx.insert(agentHandoffsTable).values(handoffs).run();
    });
  }

  listHandoffs(runId: string): HandoffRecord[] {
    return db
      .select()
      .from(agentHandoffsTable)
      .where(eq(agentHandoffsTable.runId, runId))
      .orderBy(asc(agentHandoffsTable.sequence))
      .all()
      .map((row) => ({
        id: row.id,
        runId: row.runId,
        sequence: row.sequence,
        fromAgent: row.fromAgent,
        toAgent: row.toAgent,
        stepId: row.stepId as HandoffRecord["stepId"],
        message: row.message,
        confidence: row.confidence,
        latencyMs: row.latencyMs,
        createdAt: row.createdAt,
      }));
  }

  reset(runId: string) {
    db.transaction((tx) => {
      tx.delete(agentHandoffsTable).where(eq(agentHandoffsTable.runId, runId)).run();
      tx.delete(orchestrationContextsTable)
        .where(eq(orchestrationContextsTable.runId, runId))
        .run();
    });
  }
}

export const orchestrationRepository = new OrchestrationRepository();
