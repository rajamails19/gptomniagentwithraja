import { z } from "zod";

import { BaseTool } from "../BaseTool";

const sectionSchema = z.object({
  heading: z.string(),
  body: z.string().optional(),
  bullets: z.array(z.string()).optional(),
});

const inputSchema = z.object({
  title: z.string(),
  sections: z.array(sectionSchema),
  bulletPoints: z.array(z.string()).optional(),
});

const outputSchema = z.object({
  markdown: z.string(),
  wordCount: z.number(),
  sectionCount: z.number(),
});

export class MarkdownGeneratorTool extends BaseTool<typeof inputSchema, typeof outputSchema> {
  id = "markdown-generator";
  name = "Markdown Generator";
  description = "Generates a structured markdown document from sections and bullet points.";
  category = "generation" as const;
  inputSchema = inputSchema;
  outputSchema = outputSchema;

  protected run(input: z.infer<typeof inputSchema>) {
    const parts = [`# ${input.title}`];
    if (input.bulletPoints?.length) {
      parts.push("", ...input.bulletPoints.map((point) => `- ${point}`));
    }

    input.sections.forEach((section) => {
      parts.push("", `## ${section.heading}`);
      if (section.body) parts.push(section.body);
      if (section.bullets?.length) {
        parts.push(...section.bullets.map((point) => `- ${point}`));
      }
    });

    const markdown = parts.join("\n");
    return {
      markdown,
      wordCount: markdown.split(/\s+/).filter(Boolean).length,
      sectionCount: input.sections.length,
    };
  }
}
