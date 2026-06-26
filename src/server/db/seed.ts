import { count, eq } from "drizzle-orm";

import { DEMO_SCENARIOS } from "@/lib/demo/seed-data";
import { createTrace } from "../models/mappers";
import {
  agentsTable,
  artifactsTable,
  runsTable,
  scenariosTable,
  settingsTable,
  toolsTable,
  traceEventsTable,
  workflowStepsTable,
} from "./schema";
import { db } from "./connection";

let seeded = false;

export function seedDatabaseIfNeeded() {
  if (seeded) return getSeedStatus();

  const now = new Date().toISOString();
  const [{ scenarioCount }] = db.select({ scenarioCount: count() }).from(scenariosTable).all();
  const [{ runCount }] = db.select({ runCount: count() }).from(runsTable).all();

  if (scenarioCount === 0) {
    db.insert(scenariosTable)
      .values(
        DEMO_SCENARIOS.map((scenario) => ({
          id: scenario.id,
          title: scenario.title,
          payloadJson: JSON.stringify(scenario),
          createdAt: now,
          updatedAt: now,
        })),
      )
      .run();
  }

  seedAgentsIfNeeded(now);
  seedToolsIfNeeded(now);
  seedSettingsIfNeeded(now);

  if (runCount === 0) {
    DEMO_SCENARIOS.forEach((scenario) => {
      const runId = scenario.executionRecord.id;
      const costSummary = { ...scenario.costSummary, runId };
      const finalArtifact = {
        runId,
        title: scenario.finalArtifact.title,
        filename: scenario.finalArtifact.filename,
        sizeLabel: scenario.finalArtifact.sizeLabel,
        status: scenario.finalArtifact.status,
        approvedBy: scenario.finalArtifact.approvedBy,
      };

      db.insert(runsTable)
        .values({
          id: runId,
          scenarioId: scenario.id,
          workflow: scenario.title,
          status: "completed",
          duration: scenario.executionRecord.duration,
          tokens: scenario.costSummary.totalTokens,
          cost: scenario.costSummary.totalCost,
          started: scenario.executionRecord.started,
          currentStepId: null,
          costSummaryJson: JSON.stringify(costSummary),
          finalArtifactJson: JSON.stringify(finalArtifact),
          startedAt: null,
          completedAt: now,
          cancelledAt: null,
          createdAt: now,
          updatedAt: now,
        })
        .run();

      db.insert(workflowStepsTable)
        .values(
          scenario.steps.map((step) => ({
            id: `${runId}-${step.id}`,
            runId,
            stepId: step.id,
            label: step.label,
            agent: step.agent,
            status: "completed",
            sequence: step.order,
            startedAt: null,
            completedAt: now,
            updatedAt: now,
          })),
        )
        .run();

      db.insert(traceEventsTable)
        .values(
          createTrace(scenario, runId).map((event, index) => ({
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

      db.insert(artifactsTable)
        .values({
          runId,
          title: scenario.finalArtifact.title,
          filename: scenario.finalArtifact.filename,
          sizeLabel: scenario.finalArtifact.sizeLabel,
          status: scenario.finalArtifact.status,
          approvedBy: scenario.finalArtifact.approvedBy,
          markdown: scenario.finalArtifact.markdown,
          createdAt: now,
          updatedAt: now,
        })
        .run();
    });
  }

  seedMissingWorkflowSteps(now);

  seeded = true;
  return getSeedStatus();
}

export function getSeedStatus() {
  const [{ scenarios }] = db.select({ scenarios: count() }).from(scenariosTable).all();
  const [{ runs }] = db.select({ runs: count() }).from(runsTable).all();
  return {
    seeded: scenarios > 0 && runs > 0,
    scenarios,
    runs,
  };
}

function seedAgentsIfNeeded(now: string) {
  const [{ total }] = db.select({ total: count() }).from(agentsTable).all();
  if (total > 0) return;

  const agents = new Map(
    DEMO_SCENARIOS.flatMap((scenario) => scenario.agents.map((agent) => [agent.id, agent])),
  );

  db.insert(agentsTable)
    .values(
      Array.from(agents.values()).map((agent) => ({
        id: agent.id,
        name: agent.name,
        role: agent.role,
        model: agent.model,
        payloadJson: JSON.stringify(agent),
        createdAt: now,
        updatedAt: now,
      })),
    )
    .run();
}

function seedToolsIfNeeded(now: string) {
  const [{ total }] = db.select({ total: count() }).from(toolsTable).all();
  if (total > 0) return;

  const tools = new Map<string, { id: string; name: string; scenarioIds: string[] }>();
  DEMO_SCENARIOS.forEach((scenario) => {
    scenario.toolCalls.forEach((toolCall) => {
      const id = toolCall.tool.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const existing = tools.get(id);
      if (existing) {
        if (!existing.scenarioIds.includes(scenario.id)) existing.scenarioIds.push(scenario.id);
        return;
      }
      tools.set(id, { id, name: toolCall.tool, scenarioIds: [scenario.id] });
    });
  });

  db.insert(toolsTable)
    .values(
      Array.from(tools.values()).map((tool) => ({
        id: tool.id,
        name: tool.name,
        payloadJson: JSON.stringify({ ...tool, status: "available" }),
        createdAt: now,
        updatedAt: now,
      })),
    )
    .run();
}

function seedSettingsIfNeeded(now: string) {
  const [{ total }] = db.select({ total: count() }).from(settingsTable).all();
  if (total > 0) return;

  db.insert(settingsTable)
    .values({
      key: "workspace",
      valueJson: JSON.stringify({
        workspaceName: "GPT Omni Agents Demo",
        defaultEnvironment: "development",
        region: "local",
        storageMode: "sqlite",
        apiVersion: "v1",
        guardrails: {
          piiRedaction: true,
          promptInjectionGuard: true,
          toolAllowList: true,
        },
      }),
      updatedAt: now,
    })
    .run();
}

function seedMissingWorkflowSteps(now: string) {
  const runs = db.select().from(runsTable).all();
  runs.forEach((run) => {
    const [{ total }] = db
      .select({ total: count() })
      .from(workflowStepsTable)
      .where(eq(workflowStepsTable.runId, run.id))
      .all();
    if (total > 0) return;

    const scenario = DEMO_SCENARIOS.find((item) => item.id === run.scenarioId);
    if (!scenario) return;

    db.insert(workflowStepsTable)
      .values(
        scenario.steps.map((step) => ({
          id: `${run.id}-${step.id}`,
          runId: run.id,
          stepId: step.id,
          label: step.label,
          agent: step.agent,
          status: run.status === "completed" ? "completed" : "pending",
          sequence: step.order,
          startedAt: null,
          completedAt: run.status === "completed" ? now : null,
          updatedAt: now,
        })),
      )
      .run();
  });
}
