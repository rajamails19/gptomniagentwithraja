import { z } from "zod";

import { BaseTool } from "../BaseTool";

const inputSchema = z.object({
  text: z.string(),
});

const outputSchema = z.object({
  risks: z.array(
    z.object({
      label: z.string(),
      severity: z.enum(["low", "medium", "high"]),
      recommendation: z.string(),
    }),
  ),
  severity: z.enum(["low", "medium", "high"]),
  recommendations: z.array(z.string()),
});

export class RiskScannerTool extends BaseTool<typeof inputSchema, typeof outputSchema> {
  id = "risk-scanner";
  name = "Risk Scanner";
  description = "Scans text or artifacts for common documentation, governance, and security risks.";
  category = "risk" as const;
  inputSchema = inputSchema;
  outputSchema = outputSchema;

  protected run(input: z.infer<typeof inputSchema>) {
    const checks = [
      {
        match: /api[_-]?key|secret|token/i,
        label: "Potential credential reference",
        severity: "high" as const,
        recommendation:
          "Replace secrets with placeholders and document secret handling separately.",
      },
      {
        match: /todo|tbd|unknown/i,
        label: "Unresolved placeholder",
        severity: "medium" as const,
        recommendation: "Resolve placeholders before approval.",
      },
      {
        match: /retry|rate limit|429/i,
        label: "Operational behavior documented",
        severity: "low" as const,
        recommendation: "Ensure retry guidance includes backoff and idempotency notes.",
      },
    ];

    const risks = checks.filter((check) => check.match.test(input.text));
    const severity = risks.some((risk) => risk.severity === "high")
      ? "high"
      : risks.some((risk) => risk.severity === "medium")
        ? "medium"
        : "low";

    return {
      risks,
      severity,
      recommendations: risks.length
        ? risks.map((risk) => risk.recommendation)
        : ["No material risk patterns detected in the supplied artifact."],
    };
  }
}
