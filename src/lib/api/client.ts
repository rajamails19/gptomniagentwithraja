import type { ApiFinalArtifact, ApiRun, ApiRunStatus, ApiScenario, ApiTraceEvent } from "./schemas";

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

export async function getApiRoutes() {
  const data = await requestJson<{ routes: RegisteredApiRoute[] }>("/api/v1/developer/routes");
  return data.routes;
}

export async function getApiLogs() {
  const data = await requestJson<{ logs: ApiRequestLog[] }>("/api/v1/developer/logs");
  return data.logs;
}

export async function getExecutionLogs() {
  const data = await requestJson<{ logs: unknown[] }>("/api/v1/developer/execution-logs");
  return data.logs;
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
