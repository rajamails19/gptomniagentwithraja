import type { ApiRun } from "@/lib/api/schemas";
import type { DemoScenario } from "@/lib/demo/types";
import { asc, eq } from "drizzle-orm";
import type { StoredRun } from "../models/mappers";
import { initializeDatabase } from "../db";
import { db } from "../db/connection";
import {
  artifactsTable,
  runsTable,
  traceEventsTable,
  workflowStepsTable,
  type RunRow,
  type WorkflowStepRow,
} from "../db/schema";

export type ApiWorkflowStepStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "retried"
  | "skipped";

export type ApiWorkflowStepState = {
  id: ApiRun["currentStepId"];
  label: string;
  agent: string;
  status: ApiWorkflowStepStatus;
  order: number;
  startedAt: string | null;
  completedAt: string | null;
};

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

  getLifecycleMetadata(id: string) {
    const run = db.select().from(runsTable).where(eq(runsTable.id, id)).get();
    if (!run) return undefined;
    return {
      startedAt: run.startedAt,
      completedAt: run.completedAt,
      cancelledAt: run.cancelledAt,
      updatedAt: run.updatedAt,
    };
  }

  count(): number {
    return this.list().length;
  }

  create(scenario: DemoScenario, status: ApiRun["status"] = "queued"): ApiRun {
    const run = this.createStoredRun(scenario, status, this.nextRunId(scenario));
    const now = new Date().toISOString();

    db.transaction((tx) => {
      tx.insert(runsTable)
        .values({
          id: run.id,
          scenarioId: run.scenarioId,
          workflow: run.workflow,
          status: normalizeRunStatus(run.status) ?? "queued",
          duration: run.duration,
          tokens: run.tokens,
          cost: run.cost,
          started: run.started,
          currentStepId: run.currentStepId,
          costSummaryJson: JSON.stringify(run.costSummary),
          finalArtifactJson: JSON.stringify(run.finalArtifact),
          startedAt: status === "running" ? now : null,
          completedAt: status === "completed" || status === "success" ? now : null,
          cancelledAt: status === "cancelled" ? now : null,
          createdAt: now,
          updatedAt: now,
        })
        .run();

      tx.insert(workflowStepsTable)
        .values(
          scenario.steps.map((step) => ({
            id: `${run.id}-${step.id}`,
            runId: run.id,
            stepId: step.id,
            label: step.label,
            agent: step.agent,
            status: status === "completed" || status === "success" ? "completed" : "pending",
            sequence: step.order,
            startedAt: null,
            completedAt: status === "completed" || status === "success" ? now : null,
            updatedAt: now,
          })),
        )
        .run();
    });

    return toApiRunRow(run);
  }

  updateLifecycle(
    id: string,
    values: Partial<{
      status: ApiRun["status"];
      currentStepId: ApiRun["currentStepId"];
      started: string;
      duration: string;
      tokens: number;
      cost: number;
      costSummary: ApiRun["costSummary"];
      finalArtifact: ApiRun["finalArtifact"];
      startedAt: string | null;
      completedAt: string | null;
      cancelledAt: string | null;
    }>,
  ) {
    const now = new Date().toISOString();
    db.update(runsTable)
      .set({
        status: normalizeRunStatus(values.status),
        currentStepId: values.currentStepId,
        started: values.started,
        duration: values.duration,
        tokens: values.tokens,
        cost: values.cost,
        costSummaryJson: values.costSummary ? JSON.stringify(values.costSummary) : undefined,
        finalArtifactJson: values.finalArtifact ? JSON.stringify(values.finalArtifact) : undefined,
        startedAt: values.startedAt,
        completedAt: values.completedAt,
        cancelledAt: values.cancelledAt,
        updatedAt: now,
      })
      .where(eq(runsTable.id, id))
      .run();
    return this.findById(id);
  }

  listSteps(runId: string): ApiWorkflowStepState[] {
    return db
      .select()
      .from(workflowStepsTable)
      .where(eq(workflowStepsTable.runId, runId))
      .orderBy(asc(workflowStepsTable.sequence))
      .all()
      .map(toWorkflowStepState);
  }

  updateStep(
    runId: string,
    stepId: NonNullable<ApiRun["currentStepId"]>,
    values: Partial<{
      status: ApiWorkflowStepStatus;
      startedAt: string | null;
      completedAt: string | null;
    }>,
  ) {
    db.update(workflowStepsTable)
      .set({
        status: values.status,
        startedAt: values.startedAt,
        completedAt: values.completedAt,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(workflowStepsTable.id, `${runId}-${stepId}`))
      .run();
  }

  resetExecution(runId: string, scenario: DemoScenario) {
    const now = new Date().toISOString();
    db.transaction((tx) => {
      tx.delete(traceEventsTable).where(eq(traceEventsTable.runId, runId)).run();
      tx.delete(artifactsTable).where(eq(artifactsTable.runId, runId)).run();
      tx.delete(workflowStepsTable).where(eq(workflowStepsTable.runId, runId)).run();
      tx.insert(workflowStepsTable)
        .values(
          scenario.steps.map((step) => ({
            id: `${runId}-${step.id}`,
            runId,
            stepId: step.id,
            label: step.label,
            agent: step.agent,
            status: "pending",
            sequence: step.order,
            startedAt: null,
            completedAt: null,
            updatedAt: now,
          })),
        )
        .run();
      tx.update(runsTable)
        .set({
          status: "queued",
          currentStepId: null,
          started: "queued",
          startedAt: null,
          completedAt: null,
          cancelledAt: null,
          updatedAt: now,
        })
        .where(eq(runsTable.id, runId))
        .run();
    });
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
      started:
        status === "queued"
          ? "queued"
          : status === "running"
            ? "just now"
            : scenario.executionRecord.started,
      currentStepId: status === "running" ? "user" : null,
      costSummary: { ...scenario.costSummary, runId: id },
      finalArtifact: {
        runId: id,
        title: scenario.finalArtifact.title,
        filename: scenario.finalArtifact.filename,
        sizeLabel: scenario.finalArtifact.sizeLabel,
        status: scenario.finalArtifact.status,
        approvedBy: scenario.finalArtifact.approvedBy,
      },
      trace: [],
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

function normalizeRunStatus(status: ApiRun["status"] | undefined) {
  if (!status) return undefined;
  if (status === "success") return "completed";
  if (status === "error") return "failed";
  return status;
}

function toWorkflowStepState(row: WorkflowStepRow): ApiWorkflowStepState {
  return {
    id: row.stepId as ApiWorkflowStepState["id"],
    label: row.label,
    agent: row.agent,
    status: row.status,
    order: row.sequence,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
  };
}

function toApiRunRow(run: StoredRun): ApiRun {
  const { trace: _trace, artifactMarkdown: _artifactMarkdown, ...publicRun } = run;
  void _trace;
  void _artifactMarkdown;
  return publicRun;
}

export const runRepository = new RunRepository();
