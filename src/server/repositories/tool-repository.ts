import { DEMO_SCENARIOS } from "@/lib/demo/seed-data";

export type ApiTool = {
  id: string;
  name: string;
  scenarioIds: string[];
  status: "available";
};

export class ToolRepository {
  list(): ApiTool[] {
    const tools = new Map<string, ApiTool>();

    DEMO_SCENARIOS.forEach((scenario) => {
      scenario.toolCalls.forEach((toolCall) => {
        const key = toolCall.tool;
        const existing = tools.get(key);
        if (existing) {
          if (!existing.scenarioIds.includes(scenario.id)) existing.scenarioIds.push(scenario.id);
          return;
        }

        tools.set(key, {
          id: key.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          name: key,
          scenarioIds: [scenario.id],
          status: "available",
        });
      });
    });

    return Array.from(tools.values());
  }
}

export const toolRepository = new ToolRepository();
