import type { RegisteredTool, ToolCategory, ToolExecutionContext } from "./types";
import type { z } from "zod";

export abstract class BaseTool<
  TInputSchema extends z.ZodTypeAny,
  TOutputSchema extends z.ZodTypeAny,
> implements RegisteredTool {
  abstract id: string;
  abstract name: string;
  abstract description: string;
  abstract category: ToolCategory;
  abstract inputSchema: TInputSchema;
  abstract outputSchema: TOutputSchema;

  execute(
    input: unknown,
    context?: ToolExecutionContext,
  ): Promise<z.infer<TOutputSchema>> | z.infer<TOutputSchema> {
    const parsed = this.inputSchema.parse(input);
    const output = this.run(parsed, context);
    if (output instanceof Promise) {
      return output.then((value) => this.outputSchema.parse(value));
    }
    return this.outputSchema.parse(output);
  }

  protected abstract run(
    input: z.infer<TInputSchema>,
    context?: ToolExecutionContext,
  ): Promise<z.infer<TOutputSchema>> | z.infer<TOutputSchema>;
}
