export type ExecutionLog = {
  runId: string;
  event: string;
  status: string;
  timestamp: string;
  details?: unknown;
};

const MAX_EXECUTION_LOGS = 120;
const executionLogs: ExecutionLog[] = [];

export function recordExecutionLog(log: Omit<ExecutionLog, "timestamp">) {
  executionLogs.unshift({
    ...log,
    timestamp: new Date().toISOString(),
  });
  if (executionLogs.length > MAX_EXECUTION_LOGS) executionLogs.length = MAX_EXECUTION_LOGS;
}

export function getExecutionLogs() {
  return [...executionLogs];
}
