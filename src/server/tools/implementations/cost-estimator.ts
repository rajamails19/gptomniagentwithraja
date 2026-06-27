import { z } from "zod";

import { BaseTool } from "../BaseTool";

const inputSchema = z.object({
  model: z.string(),
  promptTokens: z.number().int().nonnegative(),
  completionTokens: z.number().int().nonnegative(),
});

const outputSchema = z.object({
  model: z.string(),
  promptTokens: z.number(),
  completionTokens: z.number(),
  estimatedCost: z.number(),
  currency: z.literal("USD"),
});

const MODEL_RATES: Record<string, { input: number; output: number }> = {
  "gpt-5": { input: 0.000005, output: 0.000015 },
  "gpt-5-mini": { input: 0.0000006, output: 0.0000024 },
  default: { input: 0.000001, output: 0.000003 },
};

export class CostEstimatorTool extends BaseTool<typeof inputSchema, typeof outputSchema> {
  id = "cost-estimator";
  name = "Cost Estimator";
  description = "Estimates model cost from prompt and completion token counts.";
  category = "cost" as const;
  inputSchema = inputSchema;
  outputSchema = outputSchema;

  protected run(input: z.infer<typeof inputSchema>) {
    const rates = MODEL_RATES[input.model] ?? MODEL_RATES.default;
    return {
      model: input.model,
      promptTokens: input.promptTokens,
      completionTokens: input.completionTokens,
      estimatedCost: Number(
        (input.promptTokens * rates.input + input.completionTokens * rates.output).toFixed(6),
      ),
      currency: "USD" as const,
    };
  }
}
