import type { ApiRun } from "@/lib/api/schemas";
import type { TraceEvent } from "@/lib/demo/types";
import { eventBus } from "./EventBus";
import type { RunEvent, RunEventType } from "./types";

export class RunEventService {
  publish(runId: string, type: RunEventType, payload?: Record<string, unknown>, id?: string) {
    return eventBus.publish({ runId, type, payload, id });
  }

  publishStatus(run: ApiRun, previousStatus?: string) {
    this.publish(
      run.id,
      "run.status_changed",
      {
        status: run.status,
        previousStatus,
        currentStepId: run.currentStepId,
        cost: run.cost,
        tokens: run.tokens,
      },
      `evt_${run.id}_status_${run.status}_${run.currentStepId ?? "none"}`,
    );
  }

  publishTraceEvidence(runId: string, events: TraceEvent[]) {
    events.forEach((event) => {
      if (event.type === "tool_call") {
        this.publish(
          runId,
          "tool.started",
          { stepId: event.stepId, agent: event.agent, message: event.message },
          `evt_${event.id}_tool_started`,
        );
      }

      if (event.type === "tool_result") {
        this.publish(
          runId,
          "tool.completed",
          {
            stepId: event.stepId,
            agent: event.agent,
            message: event.message,
            latencyMs: event.latencyMs,
            cost: event.cost,
          },
          `evt_${event.id}_tool_completed`,
        );
      }

      if (event.message.toLowerCase().includes("memory updated")) {
        this.publish(
          runId,
          "memory.written",
          {
            stepId: event.stepId,
            agent: event.agent,
            memoryIds: event.memoryIds ?? [],
            message: event.message,
          },
          `evt_${event.id}_memory_written`,
        );
      }
    });
  }

  streamRunEvents(runId: string, request: Request) {
    const encoder = new TextEncoder();
    let heartbeat: ReturnType<typeof setInterval> | undefined;
    let unsubscribe: (() => void) | undefined;

    const encode = (event: RunEvent | { type: "heartbeat"; timestamp: string }) => {
      if (event.type === "heartbeat") {
        return encoder.encode(`event: heartbeat\ndata: ${JSON.stringify(event)}\n\n`);
      }
      return encoder.encode(
        `id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`,
      );
    };

    const stream = new ReadableStream<Uint8Array>({
      start: (controller) => {
        const send = (event: RunEvent | { type: "heartbeat"; timestamp: string }) => {
          try {
            controller.enqueue(encode(event));
          } catch {
            unsubscribe?.();
            if (heartbeat) clearInterval(heartbeat);
          }
        };

        send({
          id: `evt_${runId}_connected_${Date.now()}`,
          runId,
          type: "run.status_changed",
          timestamp: new Date().toISOString(),
          payload: { status: "connected", transport: "sse" },
        });

        this.listRecent(runId)
          .reverse()
          .forEach((event) => send(event));

        unsubscribe = eventBus.subscribe(runId, send);
        heartbeat = setInterval(
          () => send({ type: "heartbeat", timestamp: new Date().toISOString() }),
          15_000,
        );

        request.signal.addEventListener("abort", () => {
          unsubscribe?.();
          if (heartbeat) clearInterval(heartbeat);
          controller.close();
        });
      },
      cancel: () => {
        unsubscribe?.();
        if (heartbeat) clearInterval(heartbeat);
      },
    });

    return new Response(stream, {
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
        "x-accel-buffering": "no",
      },
    });
  }

  listRecent(runId?: string) {
    return eventBus.listRecent(runId);
  }

  listTypes() {
    return eventBus.listTypes();
  }
}

export const runEventService = new RunEventService();
