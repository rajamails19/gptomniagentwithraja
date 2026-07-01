import type {
  ApiApprovalRequest,
  ApiEvalReport,
  ApiFinalArtifact,
  ApiGuardrailOverview,
  ApiGuardrailPolicy,
  ApiMemory,
  ApiRun,
  ApiRunStatus,
  ApiScenario,
  ApiTraceEvent,
  CreateMemoryRequest,
  UpdateMemoryRequest,
} from "./schemas";

export type {
  ApiApprovalRequest,
  ApiEvalReport,
  ApiGuardrailOverview,
  ApiGuardrailPolicy,
  ApiRun,
} from "./schemas";

export type ApiHealth = {
  ok: boolean;
  service: string;
  version: string;
  mode: string;
  scenarioCount: number;
  runCount: number;
  database?: {
    connected: boolean;
    storageType: "sqlite";
    path: string;
    migrations: "applied";
    seed: {
      seeded: boolean;
      scenarios: number;
      runs: number;
    };
  };
  llm?: {
    provider: string;
    model: string;
    configured: boolean;
    reachable: boolean;
    status: string;
    message: string;
  };
  timestamp: string;
};

export type RegisteredApiRoute = {
  method: string;
  path: string;
  summary: string;
};

export type ApiRequestLog = {
  requestId: string;
  method: string;
  path: string;
  status: number;
  durationMs: number;
  timestamp: string;
  errorCode?: string;
  errorMessage?: string;
};

export type ApiToolSummary = {
  id: string;
  name: string;
  description: string;
  category: string;
  origin?: {
    type: "local" | "mcp";
    serverId?: string;
  };
};

export type ApiMCPServer = {
  id: string;
  name: string;
  description: string;
  transport: string;
  status: "connected" | "disconnected" | "error";
  health: "healthy" | "offline" | "degraded";
  toolCount: number;
  lastConnectedAt: string | null;
  timeoutMs?: number;
  configSource?: "env" | "file" | "fallback";
  validationStatus?: "valid" | "invalid";
  error?: string;
};

export type ApiMCPTool = {
  id: string;
  name: string;
  description: string;
  originServer: string;
  inputSchema: string;
  outputSchema: string;
};

export type ApiMCPCall = {
  id: string;
  serverId: string;
  toolId: string;
  requestSummary: string;
  responseSummary: string;
  status: "success" | "error";
  latencyMs: number;
  error: string | null;
  createdAt: string;
};

export type ApiMCPOverview = {
  status: string;
  configSource: "env" | "file" | "fallback";
  validationStatus: "valid" | "invalid";
  configErrors: Array<{ serverId?: string; message: string }>;
  connectedServers: number;
  availableTools: number;
  servers: ApiMCPServer[];
  tools: ApiMCPTool[];
  recentCalls: ApiMCPCall[];
};

export type ApiToolExecution = {
  id: string;
  runId: string | null;
  traceEventId: string | null;
  toolId: string;
  inputSummary: string;
  outputSummary: string;
  status: "success" | "error";
  durationMs: number;
  error: string | null;
  createdAt: string;
};

export type ApiRunEvent = {
  id: string;
  runId: string;
  type: string;
  timestamp: string;
  payload: Record<string, unknown>;
};

export type ApiAdminVisit = {
  id: string;
  path: string;
  referrer: string | null;
  userAgent: string | null;
  visitorHash: string;
  deviceType: "desktop" | "mobile" | "tablet" | "bot" | "unknown";
  country: string | null;
  region: string | null;
  city: string | null;
  timezone: string | null;
  isBot: boolean;
  createdAt: string;
};

export type ApiAdminAnalytics = {
  summary: {
    totalVisits: number;
    uniqueVisitors: number;
    mobileVisits: number;
    desktopVisits: number;
    botVisits: number;
    topPages: Array<{ path: string; visits: number }>;
    topReferrers: Array<{ referrer: string; visits: number }>;
    locations: Array<{ label: string; visits: number }>;
    visitsByDay: Array<{ date: string; visits: number }>;
  };
  visits: ApiAdminVisit[];
  privacy: {
    storesRawIp: boolean;
    locationSource: string;
    note: string;
  };
};

export interface ApiOrchestrationContext {
  runId: string;
  currentStep: string;
  currentAgent: string;
  metadata: {
    workflow: string;
    status: string;
    retryCount: number;
    averageConfidence: number;
    activeAgent: string;
    stage: string;
  };
  artifacts: Record<string, string>;
  toolOutputs: Record<string, unknown>;
  memoryReferences: string[];
}

export interface ApiHandoff {
  id: string;
  runId: string;
  sequence: number;
  fromAgent: string;
  toAgent: string;
  stepId: string;
  message: string;
  confidence: number;
  latencyMs: number;
  createdAt: string;
}

type ApiEnvelope<T> =
  | {
      success: true;
      data: T;
      timestamp: string;
      requestId: string;
    }
  | {
      success: false;
      code: string;
      message: string;
      details?: unknown;
      timestamp: string;
      requestId: string;
    };

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const payload = (await response.json()) as ApiEnvelope<T>;

  if (!response.ok || !payload.success) {
    const message = !payload.success
      ? `${payload.code}: ${payload.message}`
      : `${response.status} ${response.statusText}`;
    throw new Error(`API request failed: ${message}`);
  }

  return payload.data;
}

export const developerTokenStorageKey = "omniagents.developerToken";
export const adminAnalyticsTokenStorageKey = "omniagents.adminAnalyticsToken";

export function saveDeveloperToken(token: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(developerTokenStorageKey, token);
}

export function getDeveloperToken() {
  if (typeof window === "undefined") return "";
  return window.sessionStorage.getItem(developerTokenStorageKey) ?? "";
}

function developerRequestInit(init?: RequestInit): RequestInit {
  const token = getDeveloperToken();
  return {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      ...(token ? { "x-developer-token": token } : {}),
    },
  };
}

export function saveAdminAnalyticsToken(token: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(adminAnalyticsTokenStorageKey, token);
}

export function getAdminAnalyticsToken() {
  if (typeof window === "undefined") return "";
  return window.sessionStorage.getItem(adminAnalyticsTokenStorageKey) ?? "";
}

function adminRequestInit(init?: RequestInit): RequestInit {
  const token = getAdminAnalyticsToken();
  return {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      ...(token ? { "x-admin-token": token } : {}),
    },
  };
}

export async function getHealth() {
  return requestJson<ApiHealth>("/api/v1/health");
}

export async function getScenarios() {
  const data = await requestJson<{ scenarios: ApiScenario[] }>("/api/v1/scenarios");
  return data.scenarios;
}

export async function getScenario(id: string) {
  const data = await requestJson<{ scenario: ApiScenario }>(`/api/v1/scenarios/${id}`);
  return data.scenario;
}

export async function getRuns() {
  const data = await requestJson<{ runs: ApiRun[] }>("/api/v1/runs");
  return data.runs;
}

export async function createRun(scenarioId?: string) {
  const data = await requestJson<{ run: ApiRun }>("/api/v1/runs", {
    method: "POST",
    body: JSON.stringify({ scenarioId }),
  });
  return data.run;
}

export async function startRun(id: string) {
  const data = await requestJson<ApiRunStatus>(`/api/v1/runs/${id}/start`, {
    method: "POST",
  });
  return data;
}

export async function cancelRun(id: string) {
  const data = await requestJson<ApiRunStatus>(`/api/v1/runs/${id}/cancel`, {
    method: "POST",
  });
  return data;
}

export async function replayRun(id: string) {
  const data = await requestJson<ApiRunStatus>(`/api/v1/runs/${id}/replay`, {
    method: "POST",
  });
  return data;
}

export async function getRunStatus(id: string) {
  return requestJson<ApiRunStatus>(`/api/v1/runs/${id}/status`);
}

export async function getRun(id: string) {
  const data = await requestJson<{ run: ApiRun }>(`/api/v1/runs/${id}`);
  return data.run;
}

export async function getRunTrace(id: string) {
  const data = await requestJson<{ trace: ApiTraceEvent[] }>(`/api/v1/runs/${id}/trace`);
  return data.trace;
}

export async function getRunArtifact(id: string) {
  const data = await requestJson<{ artifact: ApiFinalArtifact }>(`/api/v1/runs/${id}/artifact`);
  return data.artifact;
}

export async function getEvals() {
  const data = await requestJson<{ reports: ApiEvalReport[] }>("/api/v1/evals");
  return data.reports;
}

export async function getRunEval(id: string) {
  const data = await requestJson<{ report: ApiEvalReport }>(`/api/v1/runs/${id}/eval`);
  return data.report;
}

export async function getGuardrails() {
  return requestJson<ApiGuardrailOverview>("/api/v1/guardrails");
}

export async function getGuardrailPolicies() {
  const data = await requestJson<{ policies: ApiGuardrailPolicy[] }>("/api/v1/guardrails/policies");
  return data.policies;
}

export async function getMemories() {
  const data = await requestJson<{ memories: ApiMemory[] }>("/api/v1/memories");
  return data.memories;
}

export async function getMemory(id: string) {
  const data = await requestJson<{ memory: ApiMemory }>(`/api/v1/memories/${id}`);
  return data.memory;
}

export async function createMemory(payload: CreateMemoryRequest) {
  const data = await requestJson<{ memory: ApiMemory }>("/api/v1/memories", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data.memory;
}

export async function updateMemory(id: string, payload: UpdateMemoryRequest) {
  const data = await requestJson<{ memory: ApiMemory }>(`/api/v1/memories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return data.memory;
}

export async function deleteMemory(id: string) {
  return requestJson<{ deleted: boolean }>(`/api/v1/memories/${id}`, { method: "DELETE" });
}

export async function getRunMemories(id: string) {
  const data = await requestJson<{ memories: ApiMemory[] }>(`/api/v1/runs/${id}/memories`);
  return data.memories;
}

export async function getScenarioMemories(id: string) {
  const data = await requestJson<{ memories: ApiMemory[] }>(`/api/v1/scenarios/${id}/memories`);
  return data.memories;
}

export async function getApprovals() {
  const data = await requestJson<{ approvals: ApiApprovalRequest[] }>("/api/v1/approvals");
  return data.approvals;
}

export async function getRunApprovals(id: string) {
  const data = await requestJson<{ approvals: ApiApprovalRequest[] }>(
    `/api/v1/runs/${id}/approvals`,
  );
  return data.approvals;
}

export async function approveApproval(id: string, reviewerNote?: string) {
  return requestJson<ApiRunStatus>(`/api/v1/approvals/${id}/approve`, {
    method: "POST",
    body: JSON.stringify({ reviewerNote }),
  });
}

export async function rejectApproval(id: string, reviewerNote?: string) {
  return requestJson<ApiRunStatus>(`/api/v1/approvals/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reviewerNote }),
  });
}

export async function getApiRoutes() {
  const data = await requestJson<{ routes: RegisteredApiRoute[] }>(
    "/api/v1/developer/routes",
    developerRequestInit(),
  );
  return data.routes;
}

export async function getApiLogs() {
  const data = await requestJson<{ logs: ApiRequestLog[] }>(
    "/api/v1/developer/logs",
    developerRequestInit(),
  );
  return data.logs;
}

export async function getAdminAnalytics() {
  return requestJson<ApiAdminAnalytics>("/api/v1/admin/analytics", adminRequestInit());
}

export async function getExecutionLogs() {
  const data = await requestJson<{ logs: unknown[] }>(
    "/api/v1/developer/execution-logs",
    developerRequestInit(),
  );
  return data.logs;
}

export async function getDeveloperEvents() {
  return requestJson<{ events: ApiRunEvent[]; types: string[] }>(
    "/api/v1/developer/events",
    developerRequestInit(),
  );
}

export async function getTools() {
  const data = await requestJson<{ tools: ApiToolSummary[] }>("/api/v1/tools");
  return data.tools;
}

export async function getToolExecutions() {
  const data = await requestJson<{ executions: ApiToolExecution[] }>(
    "/api/v1/developer/tool-executions",
    developerRequestInit(),
  );
  return data.executions;
}

export async function testLlm(prompt: string, options?: { model?: string; temperature?: number }) {
  const data = await requestJson<{
    response: string;
    latencyMs: number;
    usage?: {
      inputTokens?: number;
      outputTokens?: number;
      totalTokens?: number;
    };
    provider: string;
    model: string;
  }>("/api/v1/llm/test", {
    method: "POST",
    body: JSON.stringify({
      prompt,
      model: options?.model,
      temperature: options?.temperature,
    }),
  });
  return data;
}

export async function getRunContext(runId: string) {
  const response = await requestJson<{ context: ApiOrchestrationContext }>(
    `/api/v1/runs/${runId}/context`,
  );
  return response.context;
}

export async function getRunHandoffs(runId: string) {
  const response = await requestJson<{ handoffs: ApiHandoff[] }>(`/api/v1/runs/${runId}/handoffs`);
  return response.handoffs;
}

export async function getRunAgents(runId: string) {
  return requestJson<{ runId: string; activeAgent: string | null; agents: unknown[] }>(
    `/api/v1/runs/${runId}/agents`,
  );
}

export async function getMcpOverview() {
  return requestJson<ApiMCPOverview>("/api/v1/mcp");
}

export async function getMcpServers() {
  const data = await requestJson<{ servers: ApiMCPServer[] }>("/api/v1/mcp/servers");
  return data.servers;
}

// ── Settings ──────────────────────────────────────────────────────────────────

export type ApiSettings = {
  workspaceName: string;
  defaultEnvironment: string;
  region: string;
  storageMode: string;
  apiVersion: string;
  guardrails: {
    piiRedaction: boolean;
    promptInjectionGuard: boolean;
    toolAllowList: boolean;
    autoCostCap: boolean;
  };
};

export async function getSettings(): Promise<ApiSettings> {
  const data = await requestJson<{ settings: ApiSettings }>("/api/v1/settings");
  return data.settings;
}

export async function patchSettings(patch: Partial<ApiSettings>): Promise<ApiSettings> {
  const data = await requestJson<{ settings: ApiSettings }>("/api/v1/settings", {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  return data.settings;
}

export async function getMcpTools() {
  const data = await requestJson<{ tools: ApiMCPTool[] }>("/api/v1/mcp/tools");
  return data.tools;
}

export async function connectMcpServer(serverId: string) {
  const data = await requestJson<{ server: ApiMCPServer }>("/api/v1/mcp/connect", {
    method: "POST",
    body: JSON.stringify({ serverId }),
  });
  return data.server;
}

export async function disconnectMcpServer(serverId: string) {
  const data = await requestJson<{ server: ApiMCPServer }>("/api/v1/mcp/disconnect", {
    method: "POST",
    body: JSON.stringify({ serverId }),
  });
  return data.server;
}
