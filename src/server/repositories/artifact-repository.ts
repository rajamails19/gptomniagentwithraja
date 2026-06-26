import type { ApiFinalArtifact } from "@/lib/api/schemas";
import { eq } from "drizzle-orm";
import { initializeDatabase } from "../db";
import { db } from "../db/connection";
import { artifactsTable } from "../db/schema";

export class ArtifactRepository {
  findForRun(runId: string): ApiFinalArtifact | undefined {
    initializeDatabase();
    const artifact = db.select().from(artifactsTable).where(eq(artifactsTable.runId, runId)).get();
    if (!artifact) return undefined;
    return {
      runId: artifact.runId,
      title: artifact.title,
      filename: artifact.filename,
      sizeLabel: artifact.sizeLabel,
      status: artifact.status,
      approvedBy: artifact.approvedBy,
      markdown: artifact.markdown,
    };
  }
}

export const artifactRepository = new ArtifactRepository();
