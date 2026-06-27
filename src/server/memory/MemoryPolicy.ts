import type { MemoryWriteInput } from "./types";

const secretPatterns = [
  /sk-[a-z0-9_-]{12,}/i,
  /api[_-]?key\s*[:=]\s*\S+/i,
  /bearer\s+[a-z0-9._-]{12,}/i,
  /password\s*[:=]\s*\S+/i,
  /token\s*[:=]\s*\S+/i,
];

export class MemoryPolicy {
  sanitize(input: MemoryWriteInput): MemoryWriteInput {
    const concise = input.content.replace(/\s+/g, " ").trim().slice(0, 700);
    return {
      ...input,
      content: this.redactSecrets(concise),
      tags: [...new Set(input.tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))].slice(
        0,
        12,
      ),
      importance: Math.max(1, Math.min(100, Math.round(input.importance))),
      source: input.source.trim().slice(0, 120) || "system",
    };
  }

  isAllowed(input: MemoryWriteInput) {
    return (
      input.content.trim().length > 0 &&
      !secretPatterns.some((pattern) => pattern.test(input.content))
    );
  }

  private redactSecrets(content: string) {
    return secretPatterns.reduce(
      (value, pattern) => value.replace(pattern, "[redacted-secret]"),
      content,
    );
  }
}

export const memoryPolicy = new MemoryPolicy();
