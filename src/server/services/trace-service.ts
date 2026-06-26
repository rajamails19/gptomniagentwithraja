import type { TraceEvent } from "@/lib/demo/types";
import { traceRepository } from "../repositories/trace-repository";
import { notFound } from "../utils/errors";

export class TraceService {
  getTraceForRun(runId: string): TraceEvent[] {
    const trace = traceRepository.listForRun(runId);
    if (!trace) throw notFound("Run trace not found");
    return trace;
  }
}

export const traceService = new TraceService();
