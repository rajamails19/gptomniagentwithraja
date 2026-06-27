type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type RateLimitResult =
  | { allowed: true; limit: number; remaining: number; resetAt: number; retryAfterSeconds: 0 }
  | { allowed: false; limit: number; remaining: 0; resetAt: number; retryAfterSeconds: number };

const buckets = new Map<string, RateLimitBucket>();

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX_REQUESTS = 120;

export function checkRateLimit(request: Request, pathname: string): RateLimitResult {
  const windowMs = readPositiveInteger("API_RATE_LIMIT_WINDOW_MS", DEFAULT_WINDOW_MS);
  const maxRequests = readPositiveInteger("API_RATE_LIMIT_MAX", DEFAULT_MAX_REQUESTS);
  const now = Date.now();
  const key = `${getClientKey(request)}:${getRouteBucket(pathname)}`;
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    cleanupExpiredBuckets(now);
    return {
      allowed: true,
      limit: maxRequests,
      remaining: Math.max(0, maxRequests - 1),
      resetAt,
      retryAfterSeconds: 0,
    };
  }

  if (current.count >= maxRequests) {
    return {
      allowed: false,
      limit: maxRequests,
      remaining: 0,
      resetAt: current.resetAt,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  return {
    allowed: true,
    limit: maxRequests,
    remaining: Math.max(0, maxRequests - current.count),
    resetAt: current.resetAt,
    retryAfterSeconds: 0,
  };
}

export function applyRateLimitHeaders(response: Response, result: RateLimitResult) {
  response.headers.set("x-ratelimit-limit", String(result.limit));
  response.headers.set("x-ratelimit-remaining", String(result.remaining));
  response.headers.set("x-ratelimit-reset", String(Math.ceil(result.resetAt / 1000)));
  if (!result.allowed) {
    response.headers.set("retry-after", String(result.retryAfterSeconds));
  }
}

function getClientKey(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}

function getRouteBucket(pathname: string) {
  if (pathname.startsWith("/api/v1/developer/")) return "developer";
  if (
    pathname.includes("/execute") ||
    pathname.includes("/start") ||
    pathname.includes("/replay")
  ) {
    return "execution";
  }
  return "api";
}

function readPositiveInteger(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function cleanupExpiredBuckets(now: number) {
  if (buckets.size < 1_000) return;
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}
