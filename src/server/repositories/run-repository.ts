import type { ApiRun } from "@/lib/api/schemas";
import type { DemoScenario } from "@/lib/demo/types";
import { asc, eq } from "drizzle-orm";
import { createTrace, type StoredRun } from "../models/mappers";
import { initializeDatabase } from "../db";
import { db } from "../db/connection";
import { artifactsTable, runsTable, traceEventsTable, type RunRow } from "../db/schema";

export class RunRepository {
  private runCounter = 0;

  constructor() {
    initializeDatabase();
  }

  list(): ApiRun[] {
    return db.select().from(runsTable).orderBy(asc(runsTable.createdAt)).all().map(toApiRun);
  }

  findStoredById(id: string): StoredRun | undefined {
    const run = db.select().from(runsTable).where(eq(runsTable.id, id)).get();
    if (!run) return undefined;

    const trace = db
      .select()
      .from(traceEventsTable)
      .where(eq(traceEventsTable.runId, id))
      .orderBy(asc(traceEventsTable.sequence))
      .all()
      .map((event) => ({
        id: event.id,
        runId: event.runId,
        stepId: event.stepId as StoredRun["trace"][number]["stepId"],
        ts: event.ts,
        agent: event.agent,
        message: event.message,
        tone: event.tone,
        type: event.type,
        latencyMs: event.latencyMs ?? undefined,
        cost: event.cost ?? undefined,
        toolCallId: event.toolCallId ?? undefined,
      }));

    const artifact = db.select().from(artifactsTable).where(eq(artifactsTable.runId, id)).get();
    const publicRun = toApiRun(run);

    return {
      ...publicRun,
      trace,
      artifactMarkdown: artifact?.markdown ?? "",
    };
  }

  findById(id: string): ApiRun | undefined {
    const run = db.select().from(runsTable).where(eq(runsTable.id, id)).get();
    return run ? toApiRun(run) : undefined;
  }

  count(): number {
    return this.list().length;
  }

  create(scenario: DemoScenario, status: ApiRun["status"] = "running"): ApiRun {
    const run = this.createStoredRun(scenario, status, this.nextRunId(scenario));
    const now = new Date().toISOString();

    db.transaction((tx) => {
      tx.insert(runsTable)
        .values({
          id: run.id,
          scenarioId: run.scenarioId,
          workflow: run.workflow,
          status: run.status,
          duration: run.duration,
          tokens: run.tokens,
          cost: run.cost,
          started: run.started,
          currentStepId: run.currentStepId,
          costSummaryJson: JSON.stringify(run.costSummary),
          finalArtifactJson: JSON.stringify(run.finalArtifact),
          createdAt: now,
          updatedAt: now,
        })
        .run();

      tx.insert(traceEventsTable)
        .values(
          run.trace.map((event, index) => ({
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

      tx.insert(artifactsTable)
        .values({
          runId: run.finalArtifact.runId,
          title: run.finalArtifact.title,
          filename: run.finalArtifact.filename,
          sizeLabel: run.finalArtifact.sizeLabel,
          status: run.finalArtifact.status,
          approvedBy: run.finalArtifact.approvedBy,
          markdown: run.artifactMarkdown,
          createdAt: now,
          updatedAt: now,
        })
        .run();
    });

    return toApiRunRow(run);
  }

  private createStoredRun(
    scenario: DemoScenario,
    status: ApiRun["status"],
    id = `${scenario.executionRecord.id}-server-${++this.runCounter}`,
  ): StoredRun {
    return {
      id,
      scenarioId: scenario.id,
      workflow: scenario.title,
      status,
      duration: scenario.executionRecord.duration,
      tokens: scenario.costSummary.totalTokens,
      cost: scenario.costSummary.totalCost,
      started: status === "running" ? "just now" : scenario.executionRecord.started,
      currentStepId: status === "running" ? "planner" : null,
      costSummary: { ...scenario.costSummary, runId: id },
      finalArtifact: {
        runId: id,
        title: scenario.finalArtifact.title,
        filename: scenario.finalArtifact.filename,
        sizeLabel: scenario.finalArtifact.sizeLabel,
        status: scenario.finalArtifact.status,
        approvedBy: scenario.finalArtifact.approvedBy,
      },
      trace: createTrace(scenario, id),
      artifactMarkdown: scenario.finalArtifact.markdown,
    };
  }

  private nextRunId(scenario: DemoScenario) {
    let id: string;
    do {
      id = `${scenario.executionRecord.id}-server-${++this.runCounter}`;
    } while (this.findById(id));
    return id;
  }
}

function toApiRun(row: RunRow): ApiRun {
  return {
    id: row.id,
    scenarioId: row.scenarioId,
    workflow: row.workflow,
    status: row.status,
    duration: row.duration,
    tokens: row.tokens,
    cost: row.cost,
    started: row.started,
    currentStepId: row.currentStepId as ApiRun["currentStepId"],
    costSummary: JSON.parse(row.costSummaryJson) as ApiRun["costSummary"],
    finalArtifact: JSON.parse(row.finalArtifactJson) as ApiRun["finalArtifact"],
  };
}

function toApiRunRow(run: StoredRun): ApiRun {
  const { trace: _trace, artifactMarkdown: _artifactMarkdown, ...publicRun } = run;
  void _trace;
  void _artifactMarkdown;
  return publicRun;
}

export const runRepository = new RunRepository();
