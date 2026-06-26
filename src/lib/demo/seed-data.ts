import { agents as mockAgents } from "@/lib/mock-data";
import {
  FINAL_OUTPUT_FILENAME,
  FINAL_OUTPUT_MARKDOWN,
  FINAL_OUTPUT_TITLE,
} from "@/lib/final-output";
import type { Agent, DemoNodeId, DemoScenario, ExecutionRecord, WorkflowStep } from "./types";

export const DEMO_RUN_ID = "exec_8a22";

export const DEMO_WORKFLOW_STEPS: WorkflowStep[] = [
  {
    id: "user",
    label: "User Request",
    agent: "—",
    kind: "input",
    order: 1,
    description: "A stakeholder asks for production-grade payments API documentation.",
  },
  {
    id: "planner",
    label: "Planner",
    agent: "Planner Agent",
    kind: "agent",
    order: 2,
    description: "Breaks the goal into dependent tasks and assigns specialist agents.",
  },
  {
    id: "research",
    label: "Research",
    agent: "Research Agent",
    kind: "agent",
    order: 3,
    description: "Retrieves OpenAPI context, style guides, and relevant source references.",
  },
  {
    id: "code",
    label: "Code",
    agent: "Code Agent",
    kind: "agent",
    order: 4,
    description: "Scans route handlers and extracts endpoint/schema details.",
  },
  {
    id: "docs",
    label: "Documentation",
    agent: "Documentation Agent",
    kind: "agent",
    order: 5,
    description: "Drafts the markdown API reference and handles schema conversion retries.",
  },
  {
    id: "qa",
    label: "QA",
    agent: "QA/Test Agent",
    kind: "agent",
    order: 6,
    description: "Runs a deterministic quality checklist against the generated artifact.",
  },
  {
    id: "reviewer",
    label: "Reviewer",
    agent: "Reviewer Agent",
    kind: "agent",
    order: 7,
    description: "Enforces style, checks risk, and approves the final artifact.",
  },
  {
    id: "final",
    label: "Final Output",
    agent: "—",
    kind: "output",
    order: 8,
    description: "Publishes the approved client-ready markdown artifact.",
  },
];

export const DEMO_NODES = DEMO_WORKFLOW_STEPS.map(({ id, label, agent }) => ({
  id,
  label,
  agent,
})) as Array<{ id: DemoNodeId; label: string; agent: string }>;

export const DEMO_EXECUTION: ExecutionRecord = {
  id: DEMO_RUN_ID,
  workflow: "Demo Run · all agents",
  status: "success",
  duration: "58s",
  tokens: 68420,
  cost: 1.24,
  started: "just now",
  isDemo: true,
};

export const DEMO_STEP_MESSAGES: DemoScenario["stepMessages"] = {
  user: [{ msg: "Goal received: Create API documentation for payments service", tone: "info" }],
  planner: [
    { msg: "Decomposing goal into 6 subtasks", tone: "info" },
    { msg: "Dependency graph built · routed to 5 agents", tone: "success" },
  ],
  research: [
    { msg: "RAG retrieve openapi://payments@v4.2 · 0.94 similarity", tone: "info" },
    { msg: "Retrieved 14 context chunks (1,284 tokens)", tone: "success" },
  ],
  code: [
    { msg: "Scanning /api/payments/* route handlers", tone: "info" },
    { msg: "Found 12 endpoints · extracted Zod schemas", tone: "success" },
  ],
  docs: [
    { msg: "Drafting markdown reference v1", tone: "info" },
    { msg: "ToolTimeoutError schema_to_md > 2500ms · retry in 600ms", tone: "warn" },
    { msg: "Draft v2 complete · 18.4KB markdown", tone: "success" },
  ],
  qa: [
    { msg: "Running checklist · 14 items", tone: "info" },
    { msg: "QA passed 14/14 · added error-code table", tone: "success" },
  ],
  reviewer: [
    { msg: "Style guide v3.2 enforced · 3 micro edits", tone: "info" },
    { msg: "Approved · risk = low", tone: "success" },
  ],
  final: [{ msg: "Artifact published · payments-api-v4.2.md", tone: "success" }],
};

export const DEMO_SCENARIO: DemoScenario = {
  id: "payments-api-docs",
  name: "Payments API documentation",
  goal: "Create API documentation for payments service",
  description:
    "A deterministic investor demo showing planning, retrieval, code inspection, documentation, QA, review, and final artifact publication.",
  agents: mockAgents as Agent[],
  steps: DEMO_WORKFLOW_STEPS,
  toolCalls: [
    {
      id: "tool_schema_to_md_retry",
      runId: DEMO_RUN_ID,
      stepId: "docs",
      tool: "schema_to_md",
      status: "retry",
      latencyMs: 2500,
      inputSummary: "Serialize openapi://payments@v4.2 to GitHub markdown.",
      outputSummary: "Timed out once, then recovered with exponential backoff.",
    },
    {
      id: "tool_checklist",
      runId: DEMO_RUN_ID,
      stepId: "qa",
      tool: "checklist",
      status: "success",
      latencyMs: 940,
      inputSummary: "Validate generated markdown against 14 QA criteria.",
      outputSummary: "Passed 14/14 checks.",
    },
  ],
  costSummary: {
    runId: DEMO_RUN_ID,
    totalCost: DEMO_EXECUTION.cost,
    totalTokens: DEMO_EXECUTION.tokens,
    estimatedManualHours: "4-6h",
    modelSavingsPercent: 32,
  },
  finalArtifact: {
    runId: DEMO_RUN_ID,
    title: FINAL_OUTPUT_TITLE,
    filename: FINAL_OUTPUT_FILENAME,
    sizeLabel: "18.4 KB",
    status: "approved",
    approvedBy: "Reviewer",
    markdown: FINAL_OUTPUT_MARKDOWN,
  },
  executionRecord: DEMO_EXECUTION,
  stepMessages: DEMO_STEP_MESSAGES,
};
