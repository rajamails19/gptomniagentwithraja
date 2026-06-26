import type { ApiRun } from "@/lib/api/schemas";
import type { DemoScenario } from "@/lib/demo/types";
import { DEMO_SCENARIOS } from "@/lib/demo/seed-data";
import { createTrace, toPublicRun, type StoredRun } from "../models/mappers";

export class RunRepository {
  private runs = new Map<string, StoredRun>();
  private runCounter = 0;

  constructor() {
    this.seed();
  }

  list(): ApiRun[] {
    return Array.from(this.runs.values()).map(toPublicRun);
  }

  findStoredById(id: string): StoredRun | undefined {
    return this.runs.get(id);
  }

  findById(id: string): ApiRun | undefined {
    const run = this.findStoredById(id);
    return run ? toPublicRun(run) : undefined;
  }

  count(): number {
    return this.runs.size;
  }

  create(scenario: DemoScenario, status: ApiRun["status"] = "running"): ApiRun {
    const run = this.createStoredRun(scenario, status);
    this.runs.set(run.id, run);
    return toPublicRun(run);
  }

  private seed() {
    if (this.runs.size > 0) return;
    DEMO_SCENARIOS.forEach((scenario) => {
      const run = this.createStoredRun(scenario, "success", scenario.executionRecord.id);
      this.runs.set(run.id, run);
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
}

export const runRepository = new RunRepository();
