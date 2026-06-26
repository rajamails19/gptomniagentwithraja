import type { ApiFinalArtifact } from "@/lib/api/schemas";
import { runRepository } from "./run-repository";

export class ArtifactRepository {
  findForRun(runId: string): ApiFinalArtifact | undefined {
    const run = runRepository.findStoredById(runId);
    if (!run) return undefined;

    return {
      ...run.finalArtifact,
      markdown: run.artifactMarkdown,
    };
  }
}

export const artifactRepository = new ArtifactRepository();
