import { notFound } from "../utils/errors";
import type { RegisteredTool, ToolSummary } from "./types";
import { CostEstimatorTool } from "./implementations/cost-estimator";
import { MarkdownGeneratorTool } from "./implementations/markdown-generator";
import { OpenApiInspectorTool } from "./implementations/openapi-inspector";
import { RiskScannerTool } from "./implementations/risk-scanner";
import { TraceSummarizerTool } from "./implementations/trace-summarizer";

export class ToolRegistry {
  private tools = new Map<string, RegisteredTool>();

  constructor() {
    this.register(new OpenApiInspectorTool());
    this.register(new MarkdownGeneratorTool());
    this.register(new RiskScannerTool());
    this.register(new CostEstimatorTool());
    this.register(new TraceSummarizerTool());
  }

  register(tool: RegisteredTool) {
    this.tools.set(tool.id, tool);
  }

  get(id: string) {
    const tool = this.tools.get(id);
    if (!tool) throw notFound("Tool not found");
    return tool;
  }

  list(): ToolSummary[] {
    return Array.from(this.tools.values()).map(({ id, name, description, category }) => ({
      id,
      name,
      description,
      category,
    }));
  }
}

export const toolRegistry = new ToolRegistry();
