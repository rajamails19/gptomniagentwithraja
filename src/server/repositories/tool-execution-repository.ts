import { desc, eq } from "drizzle-orm";

import { initializeDatabase } from "../db";
import { db } from "../db/connection";
import { toolExecutionsTable } from "../db/schema";
import type { ToolExecutionLog } from "../tools/types";

export type CreateToolExecution = {
  runId?: string;
  traceEventId?: string;
  toolId: string;
  inputSummary: string;
  outputSummary: string;
  status: "success" | "error";
  durationMs: number;
  error?: string;
};

export class ToolExecutionRepository {
  create(execution: CreateToolExecution): ToolExecutionLog {
    initializeDatabase();
    const createdAt = new Date().toISOString();
    const id = `tool_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const row = {
      id,
      runId: execution.runId ?? null,
      traceEventId: execution.traceEventId ?? null,
      toolId: execution.toolId,
      inputSummary: execution.inputSummary,
      outputSummary: execution.outputSummary,
      status: execution.status,
      durationMs: execution.durationMs,
      error: execution.error ?? null,
      createdAt,
    };

    db.insert(toolExecutionsTable).values(row).run();
    return row;
  }

  listRecent(limit = 30): ToolExecutionLog[] {
    initializeDatabase();
    return db
      .select()
      .from(toolExecutionsTable)
      .orderBy(desc(toolExecutionsTable.createdAt))
      .limit(limit)
      .all();
  }

  listForRun(runId: string): ToolExecutionLog[] {
    initializeDatabase();
    return db
      .select()
      .from(toolExecutionsTable)
      .where(eq(toolExecutionsTable.runId, runId))
      .orderBy(desc(toolExecutionsTable.createdAt))
      .all();
  }
}

export const toolExecutionRepository = new ToolExecutionRepository();
