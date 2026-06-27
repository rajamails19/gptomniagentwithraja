import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import type { MCPServerConfig } from "./types";

export const fallbackMcpServers: MCPServerConfig[] = [
  {
    id: "local-mcp",
    name: "Local MCP",
    description: "Local deterministic MCP provider for orchestration context.",
    transport: "mock",
    enabled: true,
    timeoutMs: 5000,
  },
  {
    id: "filesystem-mcp",
    name: "Filesystem MCP",
    description: "Mock filesystem-style MCP provider exposing API catalogs.",
    transport: "mock",
    enabled: true,
    timeoutMs: 5000,
  },
  {
    id: "github-mcp",
    name: "GitHub MCP",
    description: "Future GitHub MCP integration placeholder.",
    transport: "stdio",
    enabled: false,
    command: "github-mcp-server",
    args: [],
    timeoutMs: 10000,
  },
  {
    id: "postgres-mcp",
    name: "Postgres MCP",
    description: "Future Postgres MCP integration placeholder.",
    transport: "stdio",
    enabled: false,
    command: "postgres-mcp-server",
    args: [],
    timeoutMs: 10000,
  },
  {
    id: "slack-mcp",
    name: "Slack MCP",
    description: "Future Slack MCP integration placeholder.",
    transport: "sse",
    enabled: false,
    url: "https://example.invalid/mcp/slack",
    timeoutMs: 10000,
  },
];

const mcpServerConfigSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string().default("MCP server"),
    enabled: z.boolean().default(true),
    transport: z.enum(["mock", "stdio", "http", "sse"]),
    command: z.string().min(1).optional(),
    args: z.array(z.string()).default([]),
    url: z.string().url().optional(),
    endpoint: z.string().url().optional(),
    timeoutMs: z.number().int().positive().max(120000).default(10000),
  })
  .superRefine((server, ctx) => {
    if (server.transport === "stdio" && !server.command) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["command"],
        message: "stdio MCP servers require command.",
      });
    }
    if (
      (server.transport === "http" || server.transport === "sse") &&
      !server.url &&
      !server.endpoint
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["url"],
        message: `${server.transport} MCP servers require url.`,
      });
    }
  });

const mcpConfigSchema = z.union([
  z.array(mcpServerConfigSchema),
  z.object({ servers: z.array(mcpServerConfigSchema) }),
]);

export type MCPConfigSource = "env" | "file" | "fallback";

export interface MCPConfigLoadResult {
  source: MCPConfigSource;
  validationStatus: "valid" | "invalid";
  servers: MCPServerConfig[];
  errors: Array<{ serverId?: string; message: string }>;
}

export function loadMcpConfig(): MCPConfigLoadResult {
  const envValue = process.env.MCP_SERVERS_JSON;
  if (envValue?.trim()) {
    return parseConfig(envValue, "env");
  }

  const filePath = resolve(process.cwd(), "mcp.config.json");
  if (existsSync(filePath)) {
    try {
      return parseConfig(readFileSync(filePath, "utf8"), "file");
    } catch (error) {
      return invalidWithFallback("file", [
        { message: error instanceof Error ? error.message : "Unable to read mcp.config.json." },
      ]);
    }
  }

  return {
    source: "fallback",
    validationStatus: "valid",
    servers: fallbackMcpServers,
    errors: [],
  };
}

function parseConfig(raw: string, source: MCPConfigSource): MCPConfigLoadResult {
  try {
    const parsedJson = JSON.parse(raw) as unknown;
    const parsed = mcpConfigSchema.safeParse(parsedJson);
    if (!parsed.success) {
      return invalidWithFallback(
        source,
        parsed.error.issues.map((issue) => ({
          message: `${issue.path.join(".") || "config"}: ${issue.message}`,
        })),
      );
    }

    const servers = Array.isArray(parsed.data) ? parsed.data : parsed.data.servers;
    return {
      source,
      validationStatus: "valid",
      servers: servers.map((server) => ({
        ...server,
        url: server.url ?? server.endpoint,
      })),
      errors: [],
    };
  } catch (error) {
    return invalidWithFallback(source, [
      { message: error instanceof Error ? error.message : "Invalid MCP config JSON." },
    ]);
  }
}

function invalidWithFallback(
  source: MCPConfigSource,
  errors: Array<{ serverId?: string; message: string }>,
): MCPConfigLoadResult {
  return {
    source,
    validationStatus: "invalid",
    servers: fallbackMcpServers,
    errors,
  };
}
