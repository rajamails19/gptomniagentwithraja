import { llmService } from "../llm/LLMService";
import { toolExecutor } from "../tools/ToolExecutor";
import { badRequest } from "../utils/errors";
import type {
  AgentDefinition,
  AgentExecutionContext,
  AgentExecutionResult,
  ExecutionContextState,
} from "./ExecutionState";

export class AgentExecutor {
  async execute(
    agent: AgentDefinition,
    context: ExecutionContextState,
  ): Promise<AgentExecutionResult> {
    const restrictedContext: AgentExecutionContext = {
      ...context,
      runTool: async (toolId, input, traceEventId) => {
        if (!agent.allowedTools.includes(toolId)) {
          throw badRequest(`${agent.name} is not allowed to execute tool: ${toolId}`);
        }
        const result = await toolExecutor.execute(toolId, input, {
          runId: context.runId,
          traceEventId,
        });
        return {
          toolId,
          output: result.output,
          durationMs: result.durationMs,
          status: result.status,
        };
      },
      generateText: async (prompt, system, model) => {
        const selectedModel = model ?? agent.allowedModels[0];
        if (selectedModel && !agent.allowedModels.includes(selectedModel)) {
          throw badRequest(`${agent.name} is not allowed to use model: ${selectedModel}`);
        }
        const result = await llmService.generate({
          prompt,
          system: system ?? agent.systemPrompt,
          model: selectedModel,
          executionId: context.runId,
          metadata: {
            agentId: agent.id,
            workflow: context.metadata.workflow,
          },
        });
        return result.text;
      },
    };

    return agent.execute(restrictedContext);
  }
}

export const agentExecutor = new AgentExecutor();
