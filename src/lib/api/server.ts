import { DEFAULT_SCENARIO_ID, DEMO_SCENARIOS, getDemoScenario } from "@/lib/demo/seed-data";
import type { DemoScenario, TraceEvent } from "@/lib/demo/types";
import {
  createRunRequestSchema,
  type ApiRun,
  type ApiScenario,
  type CreateRunRequest,
} from "./schemas";

type StoredRun = ApiRun & {
  trace: TraceEvent[];
  artifactMarkdown: string;
};

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

let runCounter = 0;
const runs = new Map<string, StoredRun>();

seedRuns();

export async function handleApiRequest(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/")) return null;

  try {
    if (request.method === "GET" && url.pathname === "/api/health") {
      return json({
        ok: true,
        service: "GPT Omni Agents API",
        mode: "in-memory",
        scenarioCount: DEMO_SCENARIOS.length,
        runCount: runs.size,
        timestamp: new Date().toISOString(),
      });
    }

    if (request.method === "GET" && url.pathname === "/api/scenarios") {
      return json({ scenarios: DEMO_SCENARIOS.map(toApiScenario) });
    }

    const scenarioMatch = url.pathname.match(/^\/api\/scenarios\/([^/]+)$/);
    if (request.method === "GET" && scenarioMatch) {
      const scenario = DEMO_SCENARIOS.find((item) => item.id === scenarioMatch[1]);
      if (!scenario) return notFound("Scenario not found");
      return json({ scenario: toApiScenario(scenario) });
    }

    if (request.method === "GET" && url.pathname === "/api/runs") {
      return json({ runs: Array.from(runs.values()).map(toPublicRun) });
    }

    if (request.method === "POST" && url.pathname === "/api/runs") {
      const payload = await parseCreateRun(request);
      const scenario = getDemoScenario(payload.scenarioId ?? DEFAULT_SCENARIO_ID);
      const run = createStoredRun(scenario, "running");
      runs.set(run.id, run);
      return json({ run: toPublicRun(run) }, 201);
    }

    const traceMatch = url.pathname.match(/^\/api\/runs\/([^/]+)\/trace$/);
    if (request.method === "GET" && traceMatch) {
      const run = runs.get(traceMatch[1]);
      if (!run) return notFound("Run not found");
      return json({ trace: run.trace });
    }

    const artifactMatch = url.pathname.match(/^\/api\/runs\/([^/]+)\/artifact$/);
    if (request.method === "GET" && artifactMatch) {
      const run = runs.get(artifactMatch[1]);
      if (!run) return notFound("Run not found");
      return json({
        artifact: {
          ...run.finalArtifact,
          markdown: run.artifactMarkdown,
        },
      });
    }

    const runMatch = url.pathname.match(/^\/api\/runs\/([^/]+)$/);
    if (request.method === "GET" && runMatch) {
      const run = runs.get(runMatch[1]);
      if (!run) return notFound("Run not found");
      return json({ run: toPublicRun(run) });
    }

    return json({ error: "API route not found" }, 404);
  } catch (error) {
    console.error(error);
    return json({ error: "API request failed" }, 500);
  }
}

function seedRuns() {
  if (runs.size > 0) return;
  DEMO_SCENARIOS.forEach((scenario) => {
    const run = createStoredRun(scenario, "success", scenario.executionRecord.id);
    runs.set(run.id, run);
  });
}

function toApiScenario(scenario: DemoScenario): ApiScenario {
  return {
    id: scenario.id,
    title: scenario.title,
    goal: scenario.goal,
    description: scenario.description,
    businessObjective: scenario.businessObjective,
    initialUserRequest: scenario.initialUserRequest,
    plannerOutput: scenario.plannerOutput,
    presentationFocus: scenario.presentationFocus,
    successMetrics: scenario.successMetrics,
    costSummary: scenario.costSummary,
    finalArtifact: {
      runId: scenario.finalArtifact.runId,
      title: scenario.finalArtifact.title,
      filename: scenario.finalArtifact.filename,
      sizeLabel: scenario.finalArtifact.sizeLabel,
      status: scenario.finalArtifact.status,
      approvedBy: scenario.finalArtifact.approvedBy,
    },
  };
}

function createStoredRun(
  scenario: DemoScenario,
  status: ApiRun["status"],
  id = `${scenario.executionRecord.id}-server-${++runCounter}`,
): StoredRun {
  const trace = createTrace(scenario, id);
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
    trace,
    artifactMarkdown: scenario.finalArtifact.markdown,
  };
}

function createTrace(scenario: DemoScenario, runId: string): TraceEvent[] {
  return scenario.steps.flatMap((step, stepIndex) =>
    scenario.stepMessages[step.id].map((message, messageIndex) => ({
      id: `${runId}-${step.id}-${messageIndex + 1}`,
      runId,
      stepId: step.id,
      ts: `00:${String(stepIndex).padStart(2, "0")}:${String(messageIndex * 8).padStart(2, "0")}`,
      agent: step.agent,
      message: message.msg,
      tone: message.tone,
      type: message.type ?? "status",
      latencyMs: message.latencyMs,
      cost: message.cost,
      toolCallId: message.toolCallId,
    })),
  );
}

function toPublicRun(run: StoredRun): ApiRun {
  const { trace: _trace, artifactMarkdown: _artifactMarkdown, ...publicRun } = run;
  void _trace;
  void _artifactMarkdown;
  return publicRun;
}

async function parseCreateRun(request: Request): Promise<CreateRunRequest> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return {};
  const body = await request.json();
  return createRunRequestSchema.parse(body);
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: jsonHeaders,
  });
}

function notFound(message: string) {
  return json({ error: message }, 404);
}
