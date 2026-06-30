import type { ApiEvalCheck, ApiEvalReport } from "@/lib/api/schemas";
import { asc, desc, eq } from "drizzle-orm";

import { initializeDatabase } from "../db";
import { db } from "../db/connection";
import {
  evalChecksTable,
  evalReportsTable,
  type EvalCheckRow,
  type EvalReportRow,
} from "../db/schema";

export type EvalReportInput = Omit<ApiEvalReport, "checks"> & {
  checks: ApiEvalCheck[];
};

export class EvalRepository {
  constructor() {
    initializeDatabase();
  }

  listRecent(limit = 50): ApiEvalReport[] {
    const reports = db
      .select()
      .from(evalReportsTable)
      .orderBy(desc(evalReportsTable.generatedAt))
      .limit(limit)
      .all();

    return reports.map((report) => ({
      ...toApiEvalReport(report),
      checks: this.listChecksForReport(report.id),
    }));
  }

  findByRunId(runId: string): ApiEvalReport | undefined {
    const report = db
      .select()
      .from(evalReportsTable)
      .where(eq(evalReportsTable.runId, runId))
      .get();
    if (!report) return undefined;

    return {
      ...toApiEvalReport(report),
      checks: this.listChecksForReport(report.id),
    };
  }

  upsert(report: EvalReportInput): ApiEvalReport {
    const now = new Date().toISOString();

    db.transaction((tx) => {
      tx.insert(evalReportsTable)
        .values({
          id: report.id,
          runId: report.runId,
          scenarioId: report.scenarioId,
          workflow: report.workflow,
          status: report.status,
          releaseDecision: report.releaseDecision,
          overallScore: report.overallScore,
          qualityScore: report.qualityScore,
          safetyScore: report.safetyScore,
          costScore: report.costScore,
          traceabilityScore: report.traceabilityScore,
          summary: report.summary,
          generatedAt: report.generatedAt,
          createdAt: report.createdAt,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: evalReportsTable.runId,
          set: {
            scenarioId: report.scenarioId,
            workflow: report.workflow,
            status: report.status,
            releaseDecision: report.releaseDecision,
            overallScore: report.overallScore,
            qualityScore: report.qualityScore,
            safetyScore: report.safetyScore,
            costScore: report.costScore,
            traceabilityScore: report.traceabilityScore,
            summary: report.summary,
            generatedAt: report.generatedAt,
            updatedAt: now,
          },
        })
        .run();

      tx.delete(evalChecksTable).where(eq(evalChecksTable.runId, report.runId)).run();
      if (report.checks.length) {
        tx.insert(evalChecksTable)
          .values(
            report.checks.map((check) => ({
              id: check.id,
              reportId: report.id,
              runId: check.runId,
              category: check.category,
              name: check.name,
              status: check.status,
              score: check.score,
              severity: check.severity,
              evidence: check.evidence,
              source: check.source,
              createdAt: check.createdAt,
            })),
          )
          .run();
      }
    });

    return this.findByRunId(report.runId) ?? report;
  }

  private listChecksForReport(reportId: string): ApiEvalCheck[] {
    return db
      .select()
      .from(evalChecksTable)
      .where(eq(evalChecksTable.reportId, reportId))
      .orderBy(asc(evalChecksTable.createdAt))
      .all()
      .map(toApiEvalCheck);
  }
}

function toApiEvalReport(row: EvalReportRow): Omit<ApiEvalReport, "checks"> {
  return {
    id: row.id,
    runId: row.runId,
    scenarioId: row.scenarioId,
    workflow: row.workflow,
    status: row.status,
    releaseDecision: row.releaseDecision,
    overallScore: row.overallScore,
    qualityScore: row.qualityScore,
    safetyScore: row.safetyScore,
    costScore: row.costScore,
    traceabilityScore: row.traceabilityScore,
    summary: row.summary,
    generatedAt: row.generatedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toApiEvalCheck(row: EvalCheckRow): ApiEvalCheck {
  return {
    id: row.id,
    reportId: row.reportId,
    runId: row.runId,
    category: row.category,
    name: row.name,
    status: row.status,
    score: row.score,
    severity: row.severity,
    evidence: row.evidence,
    source: row.source,
    createdAt: row.createdAt,
  };
}

export const evalRepository = new EvalRepository();
