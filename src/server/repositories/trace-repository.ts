import type { TraceEvent } from "@/lib/demo/types";
import { runRepository } from "./run-repository";

export class TraceRepository {
  listForRun(runId: string): TraceEvent[] | undefined {
    return runRepository.findStoredById(runId)?.trace;
  }
}

export const traceRepository = new TraceRepository();
