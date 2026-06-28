import type { RunEvent, RunEventListener, RunEventType } from "./types";

const MAX_RECENT_EVENTS = 300;

export class EventBus {
  private listeners = new Map<string, Set<RunEventListener>>();
  private recentEvents: RunEvent[] = [];
  private sequence = 0;
  private emittedIds = new Set<string>();

  publish(input: {
    runId: string;
    type: RunEventType;
    payload?: Record<string, unknown>;
    id?: string;
  }) {
    const event: RunEvent = {
      id: input.id ?? `evt_${Date.now()}_${++this.sequence}`,
      runId: input.runId,
      type: input.type,
      timestamp: new Date().toISOString(),
      payload: input.payload ?? {},
    };

    if (this.emittedIds.has(event.id)) return event;
    this.emittedIds.add(event.id);
    this.recentEvents = [event, ...this.recentEvents].slice(0, MAX_RECENT_EVENTS);

    const runListeners = this.listeners.get(event.runId);
    runListeners?.forEach((listener) => listener(event));

    return event;
  }

  subscribe(runId: string, listener: RunEventListener) {
    const runListeners = this.listeners.get(runId) ?? new Set<RunEventListener>();
    runListeners.add(listener);
    this.listeners.set(runId, runListeners);

    return () => {
      runListeners.delete(listener);
      if (runListeners.size === 0) this.listeners.delete(runId);
    };
  }

  listRecent(runId?: string) {
    return runId
      ? this.recentEvents.filter((event) => event.runId === runId)
      : [...this.recentEvents];
  }

  listTypes(): RunEventType[] {
    return [
      "run.created",
      "run.started",
      "run.status_changed",
      "step.started",
      "step.completed",
      "agent.started",
      "agent.completed",
      "tool.started",
      "tool.completed",
      "memory.written",
      "approval.requested",
      "approval.approved",
      "approval.rejected",
      "artifact.updated",
      "run.completed",
      "run.failed",
    ];
  }
}

export const eventBus = new EventBus();
