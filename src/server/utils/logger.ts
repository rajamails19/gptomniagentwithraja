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

const MAX_LOGS = 80;
const logs: ApiRequestLog[] = [];

export function createRequestId() {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function recordRequestLog(log: ApiRequestLog) {
  logs.unshift(log);
  if (logs.length > MAX_LOGS) logs.length = MAX_LOGS;

  const level = log.status >= 500 ? "error" : log.status >= 400 ? "warn" : "info";
  const message = JSON.stringify({
    requestId: log.requestId,
    method: log.method,
    path: log.path,
    status: log.status,
    durationMs: log.durationMs,
    errorCode: log.errorCode,
  });

  if (level === "error") console.error(message);
  else if (level === "warn") console.warn(message);
  else console.info(message);
}

export function getRequestLogs() {
  return [...logs];
}
