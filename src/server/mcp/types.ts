import type { z } from "zod";

export type MCPServerStatus = "connected" | "disconnected" | "error";
export type MCPTransportKind = "mock" | "stdio" | "sse" | "http";

export interface MCPServerConfig {
  id: string;
  name: string;
  description: string;
  transport: MCPTransportKind;
  enabled: boolean;
  command?: string;
  args?: string[];
  url?: string;
  endpoint?: string;
  timeoutMs?: number;
}

export interface MCPToolDefinition {
  id: string;
  name: string;
  description: string;
  serverId: string;
  inputSchema: z.ZodTypeAny;
  outputSchema: z.ZodTypeAny;
}

export interface MCPServerConnection {
  id: string;
  name: string;
  description: string;
  transport: MCPTransportKind;
  status: MCPServerStatus;
  health: "healthy" | "offline" | "degraded";
  toolCount: number;
  lastConnectedAt: string | null;
  timeoutMs?: number;
  configSource?: "env" | "file" | "fallback";
  validationStatus?: "valid" | "invalid";
  error?: string;
}

export interface MCPExecuteResult {
  output: unknown;
  latencyMs: number;
}

export interface MCPCallLog {
  id: string;
  serverId: string;
  toolId: string;
  requestSummary: string;
  responseSummary: string;
  status: "success" | "error";
  latencyMs: number;
  error: string | null;
  createdAt: string;
}
