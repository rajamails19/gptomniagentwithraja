import { count, eq } from "drizzle-orm";

import { DEMO_SCENARIOS } from "@/lib/demo/seed-data";
import { createTrace } from "../models/mappers";
import {
  agentsTable,
  approvalRequestsTable,
  artifactsTable,
  memoriesTable,
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
            memoryIdsJson: null,
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
  seedMemoriesIfNeeded(now);
  seedDemoApprovalIfNeeded(now);

  seeded = true;
  return getSeedStatus();
}

function seedMemoriesIfNeeded(now: string) {
  const [{ total }] = db.select({ total: count() }).from(memoriesTable).all();
  if (total > 0) return;

  db.insert(memoriesTable)
    .values([
      {
        id: "mem_global_demo_positioning",
        scope: "global",
        runId: null,
        scenarioId: null,
        agentId: null,
        content:
          "OmniAgents is positioned as an AI control room: plan, execute, observe, govern, and track cost across agent workflows.",
        tagsJson: JSON.stringify(["global", "demo", "positioning", "governance"]),
        importance: 82,
        source: "seed.global_demo_memory",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "mem_workflow_api_docs_quality",
        scope: "workflow",
        runId: null,
        scenarioId: "payments-api-docs",
        agentId: "qa",
        content:
          "API documentation workflows should validate auth notes, endpoint coverage, examples, and final reviewer approval before publishing.",
        tagsJson: JSON.stringify(["workflow", "payments-api-docs", "qa", "validation"]),
        importance: 74,
        source: "seed.workflow_memory",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "mem_workflow_security_response",
        scope: "workflow",
        runId: null,
        scenarioId: "security-incident-investigation",
        agentId: "research",
        content:
          "Security incident demos should preserve timeline, evidence sources, affected systems, risk level, and containment recommendation.",
        tagsJson: JSON.stringify(["workflow", "security", "research", "incident"]),
        importance: 72,
        source: "seed.workflow_memory",
        createdAt: now,
        updatedAt: now,
      },
    ])
    .run();
}

// Seed one pending demo approval so the gate is always visible on cold start.
// This is idempotent: if a pending approval already exists for the demo run, skip.
function seedDemoApprovalIfNeeded(now: string) {
  const DEMO_RUN_ID = "exec_8a22-demo-approval";
  const DEMO_SCENARIO_ID = "payments-api-docs";

  const existing = db
    .select()
    .from(approvalRequestsTable)
    .all()
    .find((r) => r.runId === DEMO_RUN_ID && r.status === "pending");
  if (existing) return;

  // Ensure the demo run row exists (the approval has a run_id FK expectation)
  const runExists = db
    .select()
    .from(runsTable)
    .all()
    .find((r) => r.id === DEMO_RUN_ID);

  if (!runExists) {
    db.insert(runsTable)
      .values({
        id: DEMO_RUN_ID,
        scenarioId: DEMO_SCENARIO_ID,
        workflow: "API Documentation Generation",
        status: "waiting_for_approval",
        duration: "58s",
        tokens: 61578,
        cost: 1.12,
        started: "seeded",
        currentStepId: "reviewer",
        costSummaryJson: JSON.stringify({
          runId: DEMO_RUN_ID,
          totalCost: 1.12,
          totalTokens: 61578,
          estimatedManualHours: "4-6h",
          modelSavingsPercent: 32,
          latencyMs: 58000,
        }),
        finalArtifactJson: "null",
        startedAt: now,
        completedAt: null,
        cancelledAt: null,
        createdAt: now,
        updatedAt: now,
      })
      .run();
  }

  db.insert(approvalRequestsTable)
    .values({
      id: "approval_demo_seed",
      runId: DEMO_RUN_ID,
      scenarioId: DEMO_SCENARIO_ID,
      agentId: "reviewer",
      stepId: "reviewer",
      status: "pending",
      reason: "Cost threshold and final artifact publishing require human review before release.",
      riskLevel: "medium",
      requestedAction: "Approve final artifact release",
      artifactPreview:
        "Payments API Documentation — covers POST /payments/intents, GET /payments/:id, webhook events, error codes, and SDK examples for JS and Python.",
      reviewerNote: null,
      createdAt: now,
      decidedAt: null,
    })
    .run();
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
        workspaceName: "OmniAgents Demo",
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
