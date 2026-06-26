import type { ApiRun, CreateRunRequest } from "@/lib/api/schemas";
import { scenarioRepository } from "../repositories/scenario-repository";
import { runRepository } from "../repositories/run-repository";
import { notFound } from "../utils/errors";

export class RunService {
  listRuns(): ApiRun[] {
    return runRepository.list();
  }

  getRun(id: string): ApiRun {
    const run = runRepository.findById(id);
    if (!run) throw notFound("Run not found");
    return run;
  }

  createRun(payload: CreateRunRequest): ApiRun {
    const scenario = payload.scenarioId
      ? scenarioRepository.findById(payload.scenarioId)
      : scenarioRepository.getDefault();
    if (!scenario) throw notFound("Scenario not found");
    return runRepository.create(scenario, "running");
  }
}

export const runService = new RunService();
