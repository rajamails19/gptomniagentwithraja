import type { ApiGuardrailPolicy } from "@/lib/api/schemas";
import { asc, eq } from "drizzle-orm";

import { initializeDatabase } from "../db";
import { db } from "../db/connection";
import { guardrailPoliciesTable, type GuardrailPolicyRow } from "../db/schema";

type GuardrailPolicyRecord = Omit<ApiGuardrailPolicy, "passRate" | "lastEvaluatedAt">;

const DEFAULT_POLICIES: GuardrailPolicyRecord[] = [
  {
    id: "grd_privacy_pii_redaction",
    name: "PII redaction before tool use",
    category: "privacy",
    status: "active",
    mode: "block",
    severity: "critical",
    description:
      "Detects sensitive customer data before prompts, traces, or tool calls leave a run.",
    scope: "prompts, traces, tools",
    trigger: "Potential email, token, key, or customer identifier detected.",
    action: "Block external execution and require sanitized context.",
    source: "settings.guardrails.piiRedaction",
    createdAt: "2026-06-30T00:00:00.000Z",
    updatedAt: "2026-06-30T00:00:00.000Z",
  },
  {
    id: "grd_security_prompt_injection",
    name: "Prompt injection defense",
    category: "security",
    status: "active",
    mode: "block",
    severity: "high",
    description:
      "Flags instructions that try to override system policy, leak secrets, or bypass tools.",
    scope: "planner, agents, memory",
    trigger: "Untrusted input attempts to change instructions or reveal hidden context.",
    action: "Ignore injected instruction, create trace evidence, and continue with safe context.",
    source: "settings.guardrails.promptInjectionGuard",
    createdAt: "2026-06-30T00:00:00.000Z",
    updatedAt: "2026-06-30T00:00:00.000Z",
  },
  {
    id: "grd_tools_allow_list",
    name: "Tool allow-list enforcement",
    category: "tools",
    status: "active",
    mode: "block",
    severity: "high",
    description: "Ensures agents can only call approved local or MCP tools for their role.",
    scope: "tool registry, MCP adapters",
    trigger: "Agent requests a tool outside its role permission set.",
    action: "Reject tool call and route the run through reviewer fallback.",
    source: "settings.guardrails.toolAllowList",
    createdAt: "2026-06-30T00:00:00.000Z",
    updatedAt: "2026-06-30T00:00:00.000Z",
  },
  {
    id: "grd_cost_cap",
    name: "Cost ceiling monitor",
    category: "cost",
    status: "monitoring",
    mode: "warn",
    severity: "medium",
    description: "Tracks token and model spend against run-level budget expectations.",
    scope: "runs, model routing",
    trigger: "Estimated cost exceeds scenario threshold or savings target is missed.",
    action: "Warn operator and require approval before expensive retry paths.",
    source: "settings.guardrails.autoCostCap",
    createdAt: "2026-06-30T00:00:00.000Z",
    updatedAt: "2026-06-30T00:00:00.000Z",
  },
  {
    id: "grd_quality_release_gate",
    name: "Quality release gate",
    category: "quality",
    status: "active",
    mode: "warn",
    severity: "high",
    description: "Requires eval evidence before a final artifact is treated as release-ready.",
    scope: "evals, artifacts",
    trigger: "Eval score drops below release threshold or trace evidence is incomplete.",
    action: "Mark run as needs review and surface failed checks.",
    source: "eval_reports",
    createdAt: "2026-06-30T00:00:00.000Z",
    updatedAt: "2026-06-30T00:00:00.000Z",
  },
  {
    id: "grd_human_approval",
    name: "Human approval for risky actions",
    category: "human_review",
    status: "active",
    mode: "block",
    severity: "high",
    description:
      "Pauses autonomous execution when a scenario, cost, risk, or artifact requires review.",
    scope: "approvals, reviewer agent",
    trigger: "High-risk finding, final artifact gate, external action, or manual scenario policy.",
    action: "Create approval request and wait for approve/reject decision.",
    source: "approval_requests",
    createdAt: "2026-06-30T00:00:00.000Z",
    updatedAt: "2026-06-30T00:00:00.000Z",
  },
];

export class GuardrailRepository {
  constructor() {
    initializeDatabase();
    this.seedDefaults();
  }

  list(): GuardrailPolicyRecord[] {
    this.seedDefaults();
    return db
      .select()
      .from(guardrailPoliciesTable)
      .orderBy(asc(guardrailPoliciesTable.category), asc(guardrailPoliciesTable.name))
      .all()
      .map(toApiPolicyRecord);
  }

  findById(id: string): GuardrailPolicyRecord | undefined {
    this.seedDefaults();
    const row = db
      .select()
      .from(guardrailPoliciesTable)
      .where(eq(guardrailPoliciesTable.id, id))
      .get();
    return row ? toApiPolicyRecord(row) : undefined;
  }

  private seedDefaults() {
    for (const policy of DEFAULT_POLICIES) {
      const existing = db
        .select({ id: guardrailPoliciesTable.id })
        .from(guardrailPoliciesTable)
        .where(eq(guardrailPoliciesTable.id, policy.id))
        .get();
      if (existing) continue;

      db.insert(guardrailPoliciesTable).values(policy).run();
    }
  }
}

function toApiPolicyRecord(row: GuardrailPolicyRow): GuardrailPolicyRecord {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    status: row.status,
    mode: row.mode,
    severity: row.severity,
    description: row.description,
    scope: row.scope,
    trigger: row.trigger,
    action: row.action,
    source: row.source,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export const guardrailRepository = new GuardrailRepository();
