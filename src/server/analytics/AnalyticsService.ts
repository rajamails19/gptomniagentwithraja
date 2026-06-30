import { createHash, randomUUID } from "node:crypto";

import { AnalyticsRepository } from "./AnalyticsRepository";
import type { DeviceType, PageVisit, VisitSummary } from "./types";

const STATIC_FILE_PATTERN = /\.[a-z0-9]{2,8}$/i;
const BOT_PATTERN =
  /bot|crawler|spider|crawling|preview|facebookexternalhit|slackbot|discordbot|linkedinbot|twitterbot/i;

class AnalyticsService {
  private repository = new AnalyticsRepository();

  recordPageVisit(request: Request, url: URL) {
    if (!shouldTrackVisit(request, url)) return;

    const userAgent = request.headers.get("user-agent");
    const isBot = Boolean(userAgent && BOT_PATTERN.test(userAgent));
    const deviceType = detectDevice(userAgent, isBot);
    const now = new Date().toISOString();

    try {
      this.repository.create({
        id: `visit_${randomUUID()}`,
        path: normalizePath(url),
        referrer: sanitizeReferrer(request.headers.get("referer")),
        userAgent: truncate(userAgent, 360),
        visitorHash: createVisitorHash(request, userAgent),
        deviceType,
        country: cleanHeader(request.headers.get("x-vercel-ip-country")),
        region: cleanHeader(request.headers.get("x-vercel-ip-country-region")),
        city: cleanHeader(request.headers.get("x-vercel-ip-city")),
        timezone: cleanHeader(request.headers.get("x-vercel-ip-timezone")),
        isBot,
        createdAt: now,
      });
    } catch (error) {
      console.warn("Visit analytics write failed", error);
    }
  }

  getOverview() {
    const visits = this.repository.listRecent(500);
    return {
      summary: summarize(visits),
      visits: visits.slice(0, 100),
      privacy: {
        storesRawIp: false,
        locationSource: "Vercel geo headers when available",
        note: "Visitors are anonymous unless the app later adds login or explicit identification.",
      },
    };
  }
}

function shouldTrackVisit(request: Request, url: URL) {
  if (request.method !== "GET") return false;
  const path = url.pathname;
  if (path.startsWith("/api/")) return false;
  if (path.startsWith("/admin/")) return false;
  if (path.startsWith("/developer/")) return false;
  if (path.startsWith("/@") || path.startsWith("/src/")) return false;
  if (path === "/favicon.ico" || path === "/robots.txt" || path === "/og-preview.png") {
    return false;
  }
  if (STATIC_FILE_PATTERN.test(path)) return false;
  return true;
}

function normalizePath(url: URL) {
  return `${url.pathname}${url.search ? "?..." : ""}`;
}

function sanitizeReferrer(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return truncate(`${url.origin}${url.pathname}`, 260);
  } catch {
    return truncate(value, 260);
  }
}

function createVisitorHash(request: Request, userAgent: string | null) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const realIp = request.headers.get("x-real-ip") ?? "";
  const salt = process.env.ANALYTICS_SALT ?? "omniagents-demo-analytics";
  return createHash("sha256")
    .update(`${salt}:${forwardedFor || realIp}:${userAgent ?? ""}`)
    .digest("hex")
    .slice(0, 20);
}

function detectDevice(userAgent: string | null, isBot: boolean): DeviceType {
  if (isBot) return "bot";
  if (!userAgent) return "unknown";
  if (/ipad|tablet|kindle/i.test(userAgent)) return "tablet";
  if (/mobile|iphone|android/i.test(userAgent)) return "mobile";
  return "desktop";
}

function cleanHeader(value: string | null) {
  if (!value) return null;
  try {
    return truncate(decodeURIComponent(value), 80);
  } catch {
    return truncate(value, 80);
  }
}

function truncate(value: string | null, length: number) {
  if (!value) return null;
  return value.length > length ? value.slice(0, length) : value;
}

function summarize(visits: PageVisit[]): VisitSummary {
  const uniqueVisitors = new Set(visits.map((visit) => visit.visitorHash)).size;
  const mobileVisits = visits.filter((visit) => visit.deviceType === "mobile").length;
  const desktopVisits = visits.filter((visit) => visit.deviceType === "desktop").length;
  const botVisits = visits.filter((visit) => visit.isBot).length;

  return {
    totalVisits: visits.length,
    uniqueVisitors,
    mobileVisits,
    desktopVisits,
    botVisits,
    topPages: topPageCounts(visits.map((visit) => visit.path)),
    topReferrers: topReferrerCounts(visits.map((visit) => visit.referrer ?? "Direct / unknown")),
    locations: topLocationCounts(visits.map(locationLabel)),
    visitsByDay: topDateCounts(visits.map((visit) => visit.createdAt.slice(0, 10))).reverse(),
  };
}

function locationLabel(visit: PageVisit) {
  const parts = [visit.city, visit.region, visit.country].filter(Boolean);
  return parts.length ? parts.join(", ") : "Unknown";
}

function countValues(values: string[], limit = 8) {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

function topPageCounts(values: string[]) {
  return countValues(values).map(([path, visits]) => ({ path, visits }));
}

function topReferrerCounts(values: string[]) {
  return countValues(values).map(([referrer, visits]) => ({ referrer, visits }));
}

function topLocationCounts(values: string[]) {
  return countValues(values).map(([label, visits]) => ({ label, visits }));
}

function topDateCounts(values: string[]) {
  return countValues(values).map(([date, visits]) => ({ date, visits }));
}

export const analyticsService = new AnalyticsService();
