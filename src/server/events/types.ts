export type RunEventType =
  | "run.created"
  | "run.started"
  | "run.status_changed"
  | "step.started"
  | "step.completed"
  | "agent.started"
  | "agent.completed"
  | "tool.started"
  | "tool.completed"
  | "memory.written"
  | "approval.requested"
  | "approval.approved"
  | "approval.rejected"
  | "artifact.updated"
  | "run.completed"
  | "run.failed";

export type RunEvent = {
  id: string;
  runId: string;
  type: RunEventType;
  timestamp: string;
  payload: Record<string, unknown>;
};

export type RunEventListener = (event: RunEvent) => void;
