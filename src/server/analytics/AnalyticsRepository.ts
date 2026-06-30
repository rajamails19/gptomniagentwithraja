import { desc } from "drizzle-orm";

import { initializeDatabase } from "../db";
import { db } from "../db/connection";
import { pageVisitsTable, type PageVisitRow } from "../db/schema";
import type { PageVisit } from "./types";

export class AnalyticsRepository {
  create(visit: PageVisit) {
    initializeDatabase();
    db.insert(pageVisitsTable).values(visit).run();
  }

  listRecent(limit = 100) {
    initializeDatabase();
    return db
      .select()
      .from(pageVisitsTable)
      .orderBy(desc(pageVisitsTable.createdAt))
      .limit(limit)
      .all()
      .map(mapVisitRow);
  }
}

function mapVisitRow(row: PageVisitRow): PageVisit {
  return {
    id: row.id,
    path: row.path,
    referrer: row.referrer,
    userAgent: row.userAgent,
    visitorHash: row.visitorHash,
    deviceType: row.deviceType,
    country: row.country,
    region: row.region,
    city: row.city,
    timezone: row.timezone,
    isBot: row.isBot,
    createdAt: row.createdAt,
  };
}
