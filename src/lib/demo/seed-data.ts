import { agents as mockAgents } from "@/lib/mock-data";
import {
  FINAL_OUTPUT_FILENAME,
  FINAL_OUTPUT_MARKDOWN,
  FINAL_OUTPUT_TITLE,
} from "@/lib/final-output";
import type {
  Agent,
  DemoNodeId,
  DemoScenario,
  ExecutionRecord,
  FinalArtifact,
  ToolCall,
  TraceTone,
  WorkflowStep,
} from "./types";

export const DEFAULT_SCENARIO_ID = "payments-api-docs";
export const DEMO_RUN_ID = "exec_8a22";

type StepSeed = Omit<WorkflowStep, "id" | "kind" | "order"> & {
  id: DemoNodeId;
  kind?: WorkflowStep["kind"];
};

type ScenarioSeed = {
  id: string;
  runId: string;
  title: string;
  goal: string;
  description: string;
  businessObjective: string;
  initialUserRequest: string;
  plannerOutput: string;
  presentationFocus: string;
  duration: string;
  totalTokens: number;
  totalCost: number;
  latencyMs: number;
  estimatedManualHours: string;
  modelSavingsPercent: number;
  successMetrics: Array<{ label: string; value: string }>;
  steps: StepSeed[];
  messages: DemoScenario["stepMessages"];
  toolCalls: Array<Omit<ToolCall, "runId">>;
  finalArtifact: Omit<FinalArtifact, "runId">;
};

const stepOrder: DemoNodeId[] = [
  "user",
  "planner",
  "research",
  "code",
  "docs",
  "qa",
  "reviewer",
  "final",
];

function scenario(seed: ScenarioSeed): DemoScenario {
  const executionRecord: ExecutionRecord = {
    id: seed.runId,
    workflow: seed.title,
    status: "success",
    duration: seed.duration,
    tokens: seed.totalTokens,
    cost: seed.totalCost,
    started: "just now",
    isDemo: true,
  };

  return {
    id: seed.id,
    name: seed.title,
    title: seed.title,
    goal: seed.goal,
    description: seed.description,
    businessObjective: seed.businessObjective,
    initialUserRequest: seed.initialUserRequest,
    plannerOutput: seed.plannerOutput,
    presentationFocus: seed.presentationFocus,
    successMetrics: seed.successMetrics,
    agents: mockAgents as Agent[],
    steps: seed.steps.map((step) => ({
      ...step,
      kind: step.kind ?? "agent",
      order: stepOrder.indexOf(step.id) + 1,
    })),
    toolCalls: seed.toolCalls.map((toolCall) => ({ ...toolCall, runId: seed.runId })),
    costSummary: {
      runId: seed.runId,
      totalCost: seed.totalCost,
      totalTokens: seed.totalTokens,
      estimatedManualHours: seed.estimatedManualHours,
      modelSavingsPercent: seed.modelSavingsPercent,
      latencyMs: seed.latencyMs,
    },
    finalArtifact: {
      ...seed.finalArtifact,
      runId: seed.runId,
    },
    executionRecord,
    stepMessages: seed.messages,
  };
}

function baseMessages({
  goal,
  plan,
  research,
  code,
  draft,
  retry,
  qa,
  review,
  artifact,
}: {
  goal: string;
  plan: string;
  research: string;
  code: string;
  draft: string;
  retry?: string;
  qa: string;
  review: string;
  artifact: string;
}): DemoScenario["stepMessages"] {
  return {
    user: [{ msg: `Goal received: ${goal}`, tone: "info", type: "status" }],
    planner: [
      { msg: "Decomposing objective into controlled agent tasks", tone: "info", type: "prompt" },
      { msg: plan, tone: "success", type: "status", latencyMs: 860, cost: 0.05 },
    ],
    research: [
      {
        msg: research,
        tone: "info",
        type: "tool_call",
        latencyMs: 760,
        toolCallId: "tool_research",
      },
      {
        msg: "Context package assembled with citations and memory scope",
        tone: "success",
        type: "tool_result",
        latencyMs: 1280,
        cost: 0.12,
        toolCallId: "tool_research",
      },
    ],
    code: [
      { msg: code, tone: "info", type: "tool_call", latencyMs: 980, toolCallId: "tool_analyze" },
      {
        msg: "Evidence map generated for downstream artifact",
        tone: "success",
        type: "tool_result",
        latencyMs: 1840,
        cost: 0.18,
        toolCallId: "tool_analyze",
      },
    ],
    docs: [
      { msg: draft, tone: "info", type: "prompt", latencyMs: 920 },
      ...(retry
        ? [
            {
              msg: retry,
              tone: "warn" as TraceTone,
              type: "retry" as const,
              latencyMs: 2500,
              toolCallId: "tool_draft_retry",
            },
          ]
        : []),
      {
        msg: "Draft artifact complete with executive summary and evidence appendix",
        tone: "success",
        type: "tool_result",
        latencyMs: retry ? 5020 : 3120,
        cost: retry ? 0.62 : 0.41,
        toolCallId: retry ? "tool_draft_retry" : "tool_draft",
      },
    ],
    qa: [
      { msg: "Running deterministic QA and governance checklist", tone: "info", type: "tool_call" },
      { msg: qa, tone: "success", type: "review", latencyMs: 980, cost: 0.13 },
    ],
    reviewer: [
      {
        msg: "Reviewer validating accuracy, risk, and stakeholder fit",
        tone: "info",
        type: "review",
      },
      { msg: review, tone: "success", type: "review", latencyMs: 760, cost: 0.08 },
    ],
    final: [{ msg: artifact, tone: "success", type: "artifact", latencyMs: 260 }],
  };
}

function steps({
  user,
  planner,
  research,
  code,
  docs,
  qa,
  reviewer,
  final,
}: Record<
  DemoNodeId,
  Partial<WorkflowStep> & Pick<WorkflowStep, "label" | "agent" | "description" | "outputSummary">
>): StepSeed[] {
  const defaults = {
    model: "gpt-4o",
    promptSummary: "Execute the assigned scenario step with traceable evidence.",
    inputSummary: "Scenario objective, scoped memory, and prior step outputs.",
    memoryContext: ["scenario_goal", "enterprise_policy", "demo_trace"],
    latencyMs: 900,
    tokens: 1500,
    cost: 0.05,
  };
  return [
    {
      id: "user",
      kind: "input",
      model: "human",
      promptSummary: "Submit the enterprise workflow request.",
      inputSummary: user.description,
      memoryContext: ["current_session_goal"],
      latencyMs: 120,
      tokens: 220,
      cost: 0,
      ...user,
    },
    { id: "planner", ...defaults, latencyMs: 860, tokens: 1380, cost: 0.05, ...planner },
    {
      id: "research",
      ...defaults,
      model: "claude-3.5-sonnet",
      latencyMs: 1280,
      tokens: 4200,
      cost: 0.12,
      ...research,
    },
    { id: "code", ...defaults, latencyMs: 1840, tokens: 6400, cost: 0.18, ...code },
    {
      id: "docs",
      ...defaults,
      model: "claude-3.5-sonnet",
      latencyMs: 3920,
      tokens: 12200,
      cost: 0.41,
      ...docs,
    },
    {
      id: "qa",
      ...defaults,
      model: "claude-3.5-sonnet",
      latencyMs: 980,
      tokens: 3900,
      cost: 0.13,
      ...qa,
    },
    { id: "reviewer", ...defaults, latencyMs: 760, tokens: 2300, cost: 0.08, ...reviewer },
    {
      id: "final",
      kind: "output",
      model: "artifact publisher",
      promptSummary: "Publish the approved scenario artifact.",
      inputSummary: "Reviewer-approved artifact and metadata.",
      memoryContext: ["artifact_registry", "approval_record"],
      latencyMs: 260,
      tokens: 120,
      cost: 0,
      ...final,
    },
  ];
}

function toolCalls(
  researchInput: string,
  analyzeInput: string,
  draftInput: string,
  qaInput: string,
): Array<Omit<ToolCall, "runId">> {
  return [
    {
      id: "tool_research",
      stepId: "research",
      tool: "rag_retrieve",
      status: "success",
      latencyMs: 1280,
      inputSummary: researchInput,
      outputSummary: "Returned scoped enterprise evidence with citations.",
    },
    {
      id: "tool_analyze",
      stepId: "code",
      tool: "evidence_analyzer",
      status: "success",
      latencyMs: 1840,
      inputSummary: analyzeInput,
      outputSummary: "Generated structured findings and risk map.",
    },
    {
      id: "tool_draft_retry",
      stepId: "docs",
      tool: "artifact_compose",
      status: "retry",
      latencyMs: 2500,
      inputSummary: draftInput,
      outputSummary: "Timed out once on large evidence set, then recovered deterministically.",
    },
    {
      id: "tool_draft",
      stepId: "docs",
      tool: "artifact_compose",
      status: "success",
      latencyMs: 3120,
      inputSummary: draftInput,
      outputSummary: "Composed final draft artifact.",
    },
    {
      id: "tool_checklist",
      stepId: "qa",
      tool: "governance_checklist",
      status: "success",
      latencyMs: 980,
      inputSummary: qaInput,
      outputSummary: "Passed deterministic quality and governance checks.",
    },
  ];
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  scenario({
    id: DEFAULT_SCENARIO_ID,
    runId: DEMO_RUN_ID,
    title: "API Documentation Generation",
    goal: "Create API documentation for payments service",
    description:
      "Planning, retrieval, code inspection, documentation, QA, review, and final artifact publication.",
    businessObjective:
      "Ship accurate developer-facing API documentation with traceable source evidence.",
    initialUserRequest: "Create client-ready API docs for the payments service v4.2.",
    plannerOutput:
      "Route to Research, Code, Documentation, QA, and Reviewer agents with one retry budget.",
    presentationFocus: "developer documentation workflow",
    duration: "58s",
    totalTokens: 68420,
    totalCost: 1.24,
    latencyMs: 58100,
    estimatedManualHours: "4-6h",
    modelSavingsPercent: 32,
    successMetrics: [
      { label: "Docs delivery", value: "65% faster" },
      { label: "Endpoint coverage", value: "12/12" },
      { label: "Traceability", value: "100%" },
    ],
    steps: steps({
      user: {
        label: "User Request",
        agent: "—",
        description: "A stakeholder asks for production-grade payments API documentation.",
        outputSummary: "Goal accepted and normalized for planning.",
      },
      planner: {
        label: "Planner",
        agent: "Planner Agent",
        description: "Breaks the goal into dependent documentation tasks.",
        outputSummary: "Six-agent execution plan created.",
      },
      research: {
        label: "Research",
        agent: "Research Agent",
        description: "Retrieves OpenAPI context, style guides, and source references.",
        memoryContext: ["openapi_payments_v4.2", "style_guide_v3.2", "payments_release_notes"],
        outputSummary: "14 high-similarity context chunks prepared.",
      },
      code: {
        label: "Code",
        agent: "Code Agent",
        description: "Scans route handlers and extracts endpoint/schema details.",
        memoryContext: ["payments_routes_index", "zod_schema_registry", "auth_policy_notes"],
        outputSummary: "12 endpoints mapped to request, response, auth, and error semantics.",
      },
      docs: {
        label: "Documentation",
        agent: "Documentation Agent",
        description: "Drafts the markdown API reference and handles schema conversion retry.",
        latencyMs: 5030,
        tokens: 19930,
        cost: 0.63,
        memoryContext: ["draft:payments_docs:v1", "style_guide_v3.2", "openapi_payments_v4.2"],
        outputSummary: "18.4KB markdown draft produced after one recovered retry.",
      },
      qa: {
        label: "QA",
        agent: "QA/Test Agent",
        description: "Runs a deterministic quality checklist.",
        outputSummary: "14/14 checklist items passed.",
      },
      reviewer: {
        label: "Reviewer",
        agent: "Reviewer Agent",
        description: "Enforces style, checks risk, and approves the artifact.",
        outputSummary: "Approved with low risk and three style edits.",
      },
      final: {
        label: "Final Output",
        agent: "—",
        description: "Publishes the approved markdown artifact.",
        outputSummary: "payments-api-v4.2.md published.",
      },
    }),
    messages: baseMessages({
      goal: "Create API documentation for payments service",
      plan: "Dependency graph built · routed to 5 agents",
      research: "RAG retrieve openapi://payments@v4.2 · 0.94 similarity",
      code: "Scanning /api/payments/* route handlers",
      draft: "Drafting markdown reference v1",
      retry: "ToolTimeoutError schema_to_md > 2500ms · retry in 600ms",
      qa: "QA passed 14/14 · added error-code table",
      review: "Approved · risk = low",
      artifact: "Artifact published · payments-api-v4.2.md",
    }),
    toolCalls: toolCalls(
      "Retrieve OpenAPI schema, style guide, and payments service notes.",
      "Scan /api/payments/* route handlers and Zod schemas.",
      "Serialize openapi://payments@v4.2 to GitHub markdown.",
      "Validate generated markdown against 14 QA criteria.",
    ),
    finalArtifact: {
      title: FINAL_OUTPUT_TITLE,
      filename: FINAL_OUTPUT_FILENAME,
      sizeLabel: "18.4 KB",
      status: "approved",
      approvedBy: "Reviewer",
      markdown: FINAL_OUTPUT_MARKDOWN,
    },
  }),
  scenario({
    id: "pull-request-review",
    runId: "exec_pr_104",
    title: "Pull Request Code Review",
    goal: "Review PR #1842 for billing service risk",
    description:
      "Engineering review workflow for correctness, security, tests, and merge readiness.",
    businessObjective: "Reduce reviewer load while catching production risks before merge.",
    initialUserRequest: "Review PR #1842 and produce a merge recommendation with required fixes.",
    plannerOutput:
      "Route diff analysis, dependency review, test inspection, QA, and reviewer approval.",
    presentationFocus: "engineering code review workflow",
    duration: "46s",
    totalTokens: 51280,
    totalCost: 0.94,
    latencyMs: 46200,
    estimatedManualHours: "1-2h",
    modelSavingsPercent: 28,
    successMetrics: [
      { label: "Review time", value: "58% faster" },
      { label: "Risk findings", value: "4" },
      { label: "Merge confidence", value: "High" },
    ],
    steps: steps({
      user: {
        label: "PR Request",
        agent: "—",
        description: "Developer requests review of billing service PR.",
        outputSummary: "PR review objective accepted.",
      },
      planner: {
        label: "Review Plan",
        agent: "Planner Agent",
        description: "Creates diff, test, risk, and approval plan.",
        outputSummary: "Review plan with blocking/non-blocking categories.",
      },
      research: {
        label: "Context",
        agent: "Research Agent",
        description: "Pulls ticket, architecture notes, and prior incidents.",
        memoryContext: ["jira:BILL-482", "billing_arch_v5", "incident:refund_loop"],
        outputSummary: "Context package assembled.",
      },
      code: {
        label: "Diff Analysis",
        agent: "Code Agent",
        description: "Inspects changed files and dependency impact.",
        outputSummary: "4 findings, 1 blocking issue, 2 test gaps.",
      },
      docs: {
        label: "Review Draft",
        agent: "Documentation Agent",
        description: "Drafts review comments and merge recommendation.",
        outputSummary: "Structured PR review produced.",
      },
      qa: {
        label: "Test Check",
        agent: "QA/Test Agent",
        description: "Validates test coverage and regression risk.",
        outputSummary: "Regression checklist passed with 2 requested tests.",
      },
      reviewer: {
        label: "Approval Gate",
        agent: "Reviewer Agent",
        description: "Approves final review recommendation.",
        outputSummary: "Changes requested before merge.",
      },
      final: {
        label: "Review Output",
        agent: "—",
        description: "Publishes PR review artifact.",
        outputSummary: "PR review summary published.",
      },
    }),
    messages: baseMessages({
      goal: "Review PR #1842 for billing service risk",
      plan: "Review graph built · diff, tests, risk, and approval routed",
      research: "Retrieving Jira ticket, architecture note, and related incident history",
      code: "Analyzing 14 changed files and dependency boundary impact",
      draft: "Drafting PR comments and merge recommendation",
      qa: "Coverage check complete · 2 missing tests requested",
      review: "Reviewer decision · changes requested before merge",
      artifact: "Artifact published · pr-1842-review.md",
    }),
    toolCalls: toolCalls(
      "Retrieve ticket and architecture context.",
      "Analyze PR diff and dependency graph.",
      "Compose PR review comments.",
      "Validate tests and merge risk.",
    ),
    finalArtifact: {
      title: "PR #1842 Review Summary",
      filename: "pr-1842-review.md",
      sizeLabel: "11.2 KB",
      status: "approved",
      approvedBy: "Reviewer",
      markdown:
        "# PR #1842 Review Summary\n\nDecision: Changes requested.\n\n## Blocking\n- Refund retry path can double-apply credits when idempotency key is absent.\n\n## Required Tests\n- Add retry exhaustion test.\n- Add missing idempotency regression test.\n\n## Merge Recommendation\nApprove after blocking fix and test evidence are attached.\n",
    },
  }),
  scenario({
    id: "security-incident",
    runId: "exec_sec_291",
    title: "Security Incident Investigation",
    goal: "Investigate suspicious admin token activity",
    description:
      "Incident response workflow for triage, evidence gathering, containment, and executive-ready report.",
    businessObjective: "Accelerate incident response while preserving audit-grade evidence.",
    initialUserRequest: "Investigate unusual admin token usage and produce a containment report.",
    plannerOutput:
      "Route log retrieval, timeline analysis, containment checks, QA, and security review.",
    presentationFocus: "security incident response workflow",
    duration: "1m 18s",
    totalTokens: 74210,
    totalCost: 1.72,
    latencyMs: 78100,
    estimatedManualHours: "6-10h",
    modelSavingsPercent: 24,
    successMetrics: [
      { label: "MTTR reduction", value: "71%" },
      { label: "Evidence chain", value: "100%" },
      { label: "Containment", value: "22m" },
    ],
    steps: steps({
      user: {
        label: "Incident Request",
        agent: "—",
        description: "Security lead requests investigation of suspicious token activity.",
        outputSummary: "Incident objective accepted.",
      },
      planner: {
        label: "IR Plan",
        agent: "Planner Agent",
        description: "Builds triage, evidence, containment, and review plan.",
        outputSummary: "Incident workstream assigned.",
      },
      research: {
        label: "Log Retrieval",
        agent: "Security Agent",
        description: "Retrieves auth logs, admin events, and network signals.",
        memoryContext: ["siem:auth_admin", "policy:token_rotation", "asset_inventory"],
        outputSummary: "Evidence timeline prepared.",
      },
      code: {
        label: "Timeline",
        agent: "Research Agent",
        description: "Correlates events and identifies affected resources.",
        outputSummary: "17 events correlated across 3 systems.",
      },
      docs: {
        label: "Incident Report",
        agent: "Documentation Agent",
        description: "Drafts incident report and containment actions.",
        latencyMs: 5400,
        tokens: 16800,
        cost: 0.72,
        outputSummary: "Containment report drafted after log-volume retry.",
      },
      qa: {
        label: "Evidence QA",
        agent: "QA/Test Agent",
        description: "Validates evidence completeness and timestamp ordering.",
        outputSummary: "Evidence chain validated.",
      },
      reviewer: {
        label: "Security Review",
        agent: "Security Agent",
        description: "Approves severity, containment, and next actions.",
        outputSummary: "Severity Medium approved.",
      },
      final: {
        label: "IR Artifact",
        agent: "—",
        description: "Publishes incident investigation report.",
        outputSummary: "Incident report published.",
      },
    }),
    messages: baseMessages({
      goal: "Investigate suspicious admin token activity",
      plan: "Incident plan built · evidence, containment, and review routed",
      research: "Querying SIEM auth_admin index and admin action logs",
      code: "Correlating token usage across identity, API, and network events",
      draft: "Drafting incident timeline and containment report",
      retry: "SIEMExportLimit exceeded · retry with 15m event windows",
      qa: "Evidence chain validated · all timestamps monotonic",
      review: "Severity Medium approved · no customer data access detected",
      artifact: "Artifact published · incident-admin-token-report.md",
    }),
    toolCalls: toolCalls(
      "Retrieve SIEM auth logs and admin activity.",
      "Correlate incident timeline and affected assets.",
      "Compose incident report.",
      "Validate evidence chain and containment checklist.",
    ),
    finalArtifact: {
      title: "Admin Token Incident Report",
      filename: "incident-admin-token-report.md",
      sizeLabel: "16.7 KB",
      status: "approved",
      approvedBy: "Security Agent",
      markdown:
        "# Admin Token Incident Report\n\nSeverity: Medium\n\n## Summary\nUnusual admin token usage was detected from a known employee device after a stale token was reused.\n\n## Findings\n- 17 correlated events across identity, API, and network logs.\n- No customer data access detected.\n- Token revoked and rotation policy enforced.\n\n## Next Actions\n- Reduce admin token TTL.\n- Add alert for stale privileged token reuse.\n",
    },
  }),
  scenario({
    id: "support-ticket",
    runId: "exec_sup_377",
    title: "Customer Support Ticket Resolution",
    goal: "Resolve enterprise customer payout delay ticket",
    description:
      "Support workflow for customer context, root cause analysis, response drafting, and approval.",
    businessObjective: "Improve response quality and speed for high-value customer escalations.",
    initialUserRequest:
      "Resolve Acme Corp's payout delay escalation with a customer-safe response.",
    plannerOutput:
      "Route account context, transaction analysis, response drafting, QA, and support manager approval.",
    presentationFocus: "customer operations workflow",
    duration: "39s",
    totalTokens: 38420,
    totalCost: 0.62,
    latencyMs: 39200,
    estimatedManualHours: "45-90m",
    modelSavingsPercent: 37,
    successMetrics: [
      { label: "Response time", value: "74% faster" },
      { label: "SLA risk", value: "Cleared" },
      { label: "Customer tone", value: "Approved" },
    ],
    steps: steps({
      user: {
        label: "Ticket Intake",
        agent: "—",
        description: "Support lead requests escalation resolution.",
        outputSummary: "Ticket objective accepted.",
      },
      planner: {
        label: "Support Plan",
        agent: "Planner Agent",
        description: "Plans account context, RCA, response, and approval.",
        outputSummary: "Resolution workflow assigned.",
      },
      research: {
        label: "Account Context",
        agent: "Research Agent",
        description: "Retrieves customer, SLA, and ticket history.",
        memoryContext: ["customer:acme", "sla:enterprise", "ticket_history"],
        outputSummary: "Customer context assembled.",
      },
      code: {
        label: "RCA",
        agent: "SQL Agent",
        description: "Analyzes payout records and queue state.",
        outputSummary: "Delay traced to bank network retry window.",
      },
      docs: {
        label: "Response Draft",
        agent: "Documentation Agent",
        description: "Drafts customer-safe support response.",
        outputSummary: "Customer response and internal notes drafted.",
      },
      qa: {
        label: "Policy Check",
        agent: "QA/Test Agent",
        description: "Checks tone, privacy, and SLA requirements.",
        outputSummary: "Response passed policy and privacy checks.",
      },
      reviewer: {
        label: "Manager Review",
        agent: "Reviewer Agent",
        description: "Approves final support response.",
        outputSummary: "Approved for customer send.",
      },
      final: {
        label: "Resolution",
        agent: "—",
        description: "Publishes support resolution artifact.",
        outputSummary: "Customer response ready.",
      },
    }),
    messages: baseMessages({
      goal: "Resolve enterprise customer payout delay ticket",
      plan: "Support workflow built · context, RCA, response, and approval routed",
      research: "Retrieving Acme account, SLA, and prior ticket context",
      code: "Running read-only payout queue analysis",
      draft: "Drafting customer-safe response and internal RCA",
      qa: "Policy check passed · no sensitive bank details exposed",
      review: "Support manager approved response",
      artifact: "Artifact published · acme-payout-resolution.md",
    }),
    toolCalls: toolCalls(
      "Retrieve account, SLA, and ticket history.",
      "Analyze payout queue and transaction status.",
      "Compose customer response and internal notes.",
      "Validate privacy, tone, and SLA requirements.",
    ),
    finalArtifact: {
      title: "Acme Payout Delay Resolution",
      filename: "acme-payout-resolution.md",
      sizeLabel: "8.9 KB",
      status: "approved",
      approvedBy: "Reviewer",
      markdown:
        "# Acme Payout Delay Resolution\n\n## Customer Response\nWe identified a temporary bank-network retry window affecting the payout batch. The payout is now confirmed for the next settlement cycle.\n\n## Internal RCA\n- Cause: downstream bank retry window\n- Customer impact: delayed payout visibility\n- SLA: within committed window\n",
    },
  }),
  scenario({
    id: "legal-contract-review",
    runId: "exec_legal_512",
    title: "Contract / Legal Document Review",
    goal: "Review enterprise MSA for risk and negotiation points",
    description:
      "Legal operations workflow for clause extraction, risk analysis, negotiation memo, and approval.",
    businessObjective:
      "Speed up contract review while making risk and approval rationale explicit.",
    initialUserRequest: "Review the Acme MSA and highlight risk, redlines, and negotiation points.",
    plannerOutput:
      "Route clause extraction, policy comparison, memo drafting, QA, and legal reviewer approval.",
    presentationFocus: "legal operations workflow",
    duration: "1m 04s",
    totalTokens: 62840,
    totalCost: 1.48,
    latencyMs: 64200,
    estimatedManualHours: "3-5h",
    modelSavingsPercent: 21,
    successMetrics: [
      { label: "Review cycle", value: "52% faster" },
      { label: "Risk clauses", value: "9" },
      { label: "Audit trail", value: "Complete" },
    ],
    steps: steps({
      user: {
        label: "Legal Request",
        agent: "—",
        description: "Legal ops requests MSA review.",
        outputSummary: "Contract review objective accepted.",
      },
      planner: {
        label: "Review Plan",
        agent: "Planner Agent",
        description: "Plans clause extraction, risk mapping, and approval.",
        outputSummary: "Legal review workflow assigned.",
      },
      research: {
        label: "Clause Extract",
        agent: "Research Agent",
        description: "Extracts clauses and policy references.",
        memoryContext: ["msa:acme_v7", "policy:legal_playbook", "dpa:standard"],
        outputSummary: "Clause inventory prepared.",
      },
      code: {
        label: "Risk Compare",
        agent: "Security Agent",
        description: "Compares terms against legal playbook and privacy policy.",
        outputSummary: "9 risk clauses identified.",
      },
      docs: {
        label: "Negotiation Memo",
        agent: "Documentation Agent",
        description: "Drafts risk memo and negotiation recommendations.",
        outputSummary: "Negotiation memo drafted.",
      },
      qa: {
        label: "Legal QA",
        agent: "QA/Test Agent",
        description: "Validates citations and risk labels.",
        outputSummary: "All clause references verified.",
      },
      reviewer: {
        label: "Counsel Review",
        agent: "Reviewer Agent",
        description: "Approves legal memo for stakeholder review.",
        outputSummary: "Approved with high-priority redlines.",
      },
      final: {
        label: "Legal Artifact",
        agent: "—",
        description: "Publishes legal review artifact.",
        outputSummary: "Contract review memo published.",
      },
    }),
    messages: baseMessages({
      goal: "Review enterprise MSA for risk and negotiation points",
      plan: "Legal review plan built · clauses, policy, memo, and approval routed",
      research: "Extracting clauses from Acme MSA and legal playbook",
      code: "Comparing indemnity, liability, data, and termination terms",
      draft: "Drafting negotiation memo with risk-ranked redlines",
      retry: "Clause table exceeded parser window · retry with section chunks",
      qa: "Citation QA passed · 9/9 clauses verified",
      review: "Counsel approved memo with 3 high-priority redlines",
      artifact: "Artifact published · acme-msa-review.md",
    }),
    toolCalls: toolCalls(
      "Extract MSA clauses and policy references.",
      "Compare clauses against legal playbook.",
      "Compose negotiation memo.",
      "Validate clause citations and risk labels.",
    ),
    finalArtifact: {
      title: "Acme MSA Legal Review",
      filename: "acme-msa-review.md",
      sizeLabel: "14.1 KB",
      status: "approved",
      approvedBy: "Reviewer",
      markdown:
        "# Acme MSA Legal Review\n\n## Executive Summary\nNine clauses require review before signature.\n\n## High Priority\n- Liability cap is uncapped for data incidents.\n- Indemnity language exceeds standard playbook.\n- Termination notice conflicts with enterprise policy.\n\n## Recommendation\nReturn redlines on high-priority terms and accept low-risk wording changes.\n",
    },
  }),
  scenario({
    id: "executive-report",
    runId: "exec_exec_640",
    title: "Executive Business Report Generation",
    goal: "Generate weekly executive business report",
    description:
      "Executive reporting workflow for metrics retrieval, variance analysis, narrative, QA, and approval.",
    businessObjective:
      "Create board-ready operating updates with consistent metrics and traceable sources.",
    initialUserRequest:
      "Create this week's executive report for revenue, product, support, and risk.",
    plannerOutput:
      "Route KPI retrieval, variance analysis, narrative drafting, QA, and executive review.",
    presentationFocus: "executive reporting workflow",
    duration: "52s",
    totalTokens: 48960,
    totalCost: 0.88,
    latencyMs: 52100,
    estimatedManualHours: "2-4h",
    modelSavingsPercent: 42,
    successMetrics: [
      { label: "Report time", value: "68% faster" },
      { label: "Metric checks", value: "24/24" },
      { label: "Exec-ready", value: "Approved" },
    ],
    steps: steps({
      user: {
        label: "Report Request",
        agent: "—",
        description: "Chief of staff requests weekly business report.",
        outputSummary: "Reporting objective accepted.",
      },
      planner: {
        label: "Report Plan",
        agent: "Planner Agent",
        description: "Plans KPI retrieval, analysis, narrative, and approval.",
        outputSummary: "Report workflow assigned.",
      },
      research: {
        label: "KPI Retrieval",
        agent: "SQL Agent",
        description: "Retrieves revenue, product, support, and risk metrics.",
        memoryContext: ["warehouse:kpi_mart", "weekly_business_template", "exec_style_guide"],
        outputSummary: "24 KPI values retrieved.",
      },
      code: {
        label: "Variance",
        agent: "Research Agent",
        description: "Calculates week-over-week variance and key drivers.",
        outputSummary: "5 material variances identified.",
      },
      docs: {
        label: "Narrative",
        agent: "Documentation Agent",
        description: "Drafts concise executive narrative.",
        outputSummary: "Board-ready report narrative drafted.",
      },
      qa: {
        label: "Metric QA",
        agent: "QA/Test Agent",
        description: "Validates formulas, sources, and executive tone.",
        outputSummary: "24/24 metric checks passed.",
      },
      reviewer: {
        label: "Exec Review",
        agent: "Reviewer Agent",
        description: "Approves final business report.",
        outputSummary: "Approved for leadership distribution.",
      },
      final: {
        label: "Report",
        agent: "—",
        description: "Publishes executive report.",
        outputSummary: "Weekly executive report published.",
      },
    }),
    messages: baseMessages({
      goal: "Generate weekly executive business report",
      plan: "Executive report plan built · KPIs, variance, narrative, and approval routed",
      research: "Running read-only KPI retrieval from revenue, product, support, and risk marts",
      code: "Calculating WoW variance and driver summary",
      draft: "Drafting executive narrative and metric appendix",
      qa: "Metric QA passed · 24/24 source checks",
      review: "Executive reviewer approved for distribution",
      artifact: "Artifact published · weekly-exec-report.md",
    }),
    toolCalls: toolCalls(
      "Retrieve executive KPI marts.",
      "Calculate variance and driver summary.",
      "Compose executive report.",
      "Validate formulas, sources, and tone.",
    ),
    finalArtifact: {
      title: "Weekly Executive Business Report",
      filename: "weekly-exec-report.md",
      sizeLabel: "12.6 KB",
      status: "approved",
      approvedBy: "Reviewer",
      markdown:
        "# Weekly Executive Business Report\n\n## Highlights\n- Revenue is up 8.4% week over week.\n- Activation improved after onboarding fixes.\n- Support backlog fell 14%.\n\n## Watch Items\n- Enterprise sales cycle increased by 3 days.\n- API latency remains elevated in EU region.\n\n## Recommendation\nPrioritize EU latency remediation and enterprise deal review.\n",
    },
  }),
];

export const DEMO_SCENARIO = getDemoScenario(DEFAULT_SCENARIO_ID);
export const DEMO_EXECUTION = DEMO_SCENARIO.executionRecord;
export const DEMO_WORKFLOW_STEPS = DEMO_SCENARIO.steps;
export const DEMO_STEP_MESSAGES = DEMO_SCENARIO.stepMessages;
export const DEMO_NODES = DEMO_WORKFLOW_STEPS.map(({ id, label, agent }) => ({
  id,
  label,
  agent,
})) as Array<{ id: DemoNodeId; label: string; agent: string }>;

export function getDemoScenario(id: string): DemoScenario {
  return DEMO_SCENARIOS.find((item) => item.id === id) ?? DEMO_SCENARIOS[0];
}
