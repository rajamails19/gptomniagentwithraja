import type {
  ApiEvalCheck,
  ApiGuardrailOverview,
  ApiGuardrailPolicy,
  ApiGuardrailSignal,
} from "@/lib/api/schemas";

import { evalService } from "./eval-service";
import { guardrailRepository } from "../repositories/guardrail-repository";
import { settingsRepository } from "../repositories/settings-repository";

const CATEGORY_TO_POLICY: Record<ApiEvalCheck["category"], string> = {
  accuracy: "grd_quality_release_gate",
  completeness: "grd_quality_release_gate",
  safety: "grd_security_prompt_injection",
  tooling: "grd_tools_allow_list",
  cost: "grd_cost_cap",
  traceability: "grd_quality_release_gate",
  approval: "grd_human_approval",
};

export class GuardrailService {
  getOverview(): ApiGuardrailOverview {
    const settings = settingsRepository.get();
    const reports = evalService.listReports();
    const signals = reports.flatMap((report) =>
      report.checks
        .filter((check) =>
          ["safety", "tooling", "cost", "approval", "traceability"].includes(check.category),
        )
        .map(
          (check): ApiGuardrailSignal => ({
            id: `signal_${check.id}`,
            policyId: CATEGORY_TO_POLICY[check.category],
            runId: check.runId,
            status: check.status,
            severity: check.severity,
            evidence: check.evidence,
            source: check.source,
            createdAt: check.createdAt,
          }),
        ),
    );

    const policies = guardrailRepository.list().map((policy): ApiGuardrailPolicy => {
      const policySignals = signals.filter((signal) => signal.policyId === policy.id);
      const passed = policySignals.filter((signal) => signal.status === "passed").length;
      const passRate = policySignals.length
        ? Math.round((passed / policySignals.length) * 100)
        : policy.status === "disabled"
          ? 0
          : 100;
      const lastEvaluatedAt =
        policySignals
          .map((signal) => signal.createdAt)
          .sort()
          .at(-1) ?? null;

      return {
        ...policy,
        status: resolvePolicyStatus(policy.id, policy.status, settings.guardrails),
        passRate,
        lastEvaluatedAt,
      };
    });

    const activePolicies = policies.filter((policy) => policy.status !== "disabled").length;
    const blockingPolicies = policies.filter(
      (policy) => policy.status !== "disabled" && policy.mode === "block",
    ).length;
    const warningPolicies = signals.filter((signal) => signal.status === "warning").length;
    const failedSignals = signals.filter((signal) => signal.status === "failed").length;
    const latestSignalAt =
      signals
        .map((signal) => signal.createdAt)
        .sort()
        .at(-1) ?? null;

    return {
      summary: {
        totalPolicies: policies.length,
        activePolicies,
        blockingPolicies,
        warningPolicies,
        disabledPolicies: policies.length - activePolicies,
        latestSignalAt,
        riskPosture: failedSignals > 0 ? "blocked" : warningPolicies > 0 ? "watch" : "controlled",
      },
      policies,
      signals: signals.slice(0, 30),
    };
  }

  listPolicies(): ApiGuardrailPolicy[] {
    return this.getOverview().policies;
  }
}

function resolvePolicyStatus(
  id: string,
  fallback: ApiGuardrailPolicy["status"],
  settings: ReturnType<typeof settingsRepository.get>["guardrails"],
): ApiGuardrailPolicy["status"] {
  if (id === "grd_privacy_pii_redaction") return settings.piiRedaction ? "active" : "disabled";
  if (id === "grd_security_prompt_injection") {
    return settings.promptInjectionGuard ? "active" : "disabled";
  }
  if (id === "grd_tools_allow_list") return settings.toolAllowList ? "active" : "disabled";
  if (id === "grd_cost_cap") return settings.autoCostCap ? "active" : "monitoring";
  return fallback;
}

export const guardrailService = new GuardrailService();
