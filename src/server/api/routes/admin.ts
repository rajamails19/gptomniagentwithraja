import { z } from "zod";

import type { ApiRoute } from "../../types/api";
import { analyticsService } from "../../analytics/AnalyticsService";
import { json } from "../../utils/http";

const analyticsResponseSchema = z.object({
  summary: z.object({
    totalVisits: z.number(),
    uniqueVisitors: z.number(),
    mobileVisits: z.number(),
    desktopVisits: z.number(),
    botVisits: z.number(),
    topPages: z.array(z.object({ path: z.string(), visits: z.number() })),
    topReferrers: z.array(z.object({ referrer: z.string(), visits: z.number() })),
    locations: z.array(z.object({ label: z.string(), visits: z.number() })),
    visitsByDay: z.array(z.object({ date: z.string(), visits: z.number() })),
  }),
  visits: z.array(
    z.object({
      id: z.string(),
      path: z.string(),
      referrer: z.string().nullable(),
      userAgent: z.string().nullable(),
      visitorHash: z.string(),
      deviceType: z.enum(["desktop", "mobile", "tablet", "bot", "unknown"]),
      country: z.string().nullable(),
      region: z.string().nullable(),
      city: z.string().nullable(),
      timezone: z.string().nullable(),
      isBot: z.boolean(),
      createdAt: z.string(),
    }),
  ),
  privacy: z.object({
    storesRawIp: z.boolean(),
    locationSource: z.string(),
    note: z.string(),
  }),
});

export const adminRoutes: ApiRoute[] = [
  {
    method: "GET",
    path: "/api/v1/admin/analytics",
    summary: "Protected anonymous site visit analytics for the owner.",
    handler: ({ requestId }) => {
      const data = analyticsResponseSchema.parse(analyticsService.getOverview());
      return json(data, requestId);
    },
  },
];
