import type { ApiFinalArtifact, ApiRun, ApiScenario, ApiTraceEvent } from "./schemas";

export type ApiHealth = {
  ok: boolean;
  service: string;
  mode: string;
  scenarioCount: number;
  runCount: number;
  timestamp: string;
};

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}

export async function getHealth() {
  return requestJson<ApiHealth>("/api/health");
}

export async function getScenarios() {
  const data = await requestJson<{ scenarios: ApiScenario[] }>("/api/scenarios");
  return data.scenarios;
}

export async function getScenario(id: string) {
  const data = await requestJson<{ scenario: ApiScenario }>(`/api/scenarios/${id}`);
  return data.scenario;
}

export async function getRuns() {
  const data = await requestJson<{ runs: ApiRun[] }>("/api/runs");
  return data.runs;
}

export async function createRun(scenarioId?: string) {
  const data = await requestJson<{ run: ApiRun }>("/api/runs", {
    method: "POST",
    body: JSON.stringify({ scenarioId }),
  });
  return data.run;
}

export async function getRun(id: string) {
  const data = await requestJson<{ run: ApiRun }>(`/api/runs/${id}`);
  return data.run;
}

export async function getRunTrace(id: string) {
  const data = await requestJson<{ trace: ApiTraceEvent[] }>(`/api/runs/${id}/trace`);
  return data.trace;
}

export async function getRunArtifact(id: string) {
  const data = await requestJson<{ artifact: ApiFinalArtifact }>(`/api/runs/${id}/artifact`);
  return data.artifact;
}
