export type DeviceType = "desktop" | "mobile" | "tablet" | "bot" | "unknown";

export interface PageVisit {
  id: string;
  path: string;
  referrer: string | null;
  userAgent: string | null;
  visitorHash: string;
  deviceType: DeviceType;
  country: string | null;
  region: string | null;
  city: string | null;
  timezone: string | null;
  isBot: boolean;
  createdAt: string;
}

export interface VisitSummary {
  totalVisits: number;
  uniqueVisitors: number;
  mobileVisits: number;
  desktopVisits: number;
  botVisits: number;
  topPages: Array<{ path: string; visits: number }>;
  topReferrers: Array<{ referrer: string; visits: number }>;
  locations: Array<{ label: string; visits: number }>;
  visitsByDay: Array<{ date: string; visits: number }>;
}
