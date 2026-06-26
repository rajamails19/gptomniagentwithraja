import type { ApiFinalArtifact } from "@/lib/api/schemas";
import { artifactRepository } from "../repositories/artifact-repository";
import { notFound } from "../utils/errors";

export class ArtifactService {
  getArtifactForRun(runId: string): ApiFinalArtifact {
    const artifact = artifactRepository.findForRun(runId);
    if (!artifact) throw notFound("Run artifact not found");
    return artifact;
  }
}

export const artifactService = new ArtifactService();
