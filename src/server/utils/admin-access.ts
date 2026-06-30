const ADMIN_TOKEN_ENV = "ADMIN_ANALYTICS_TOKEN";
const COOKIE_NAME = "omniagents_admin_token";

export function isAdminApiPath(pathname: string) {
  return pathname.startsWith("/api/v1/admin/");
}

export function isAdminPagePath(pathname: string) {
  return pathname === "/admin/analytics" || pathname.startsWith("/admin/analytics/");
}

export function isAdminAccessAllowed(request: Request, url: URL) {
  const expectedToken = process.env[ADMIN_TOKEN_ENV]?.trim();
  if (!expectedToken) return false;

  const providedToken =
    request.headers.get("x-admin-token") ??
    url.searchParams.get("token") ??
    url.searchParams.get("admin_token") ??
    readCookie(request, COOKIE_NAME) ??
    "";

  return timingSafeEqual(providedToken, expectedToken);
}

export function shouldSetAdminAccessCookie(url: URL) {
  return Boolean(url.searchParams.get("token") ?? url.searchParams.get("admin_token"));
}

export function setAdminAccessCookie(response: Response, url: URL) {
  const token = url.searchParams.get("token") ?? url.searchParams.get("admin_token");
  if (!token) return;
  response.headers.append(
    "set-cookie",
    `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`,
  );
}

export function adminAccessNotFoundResponse() {
  return new Response("Not found", {
    status: 404,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function timingSafeEqual(provided: string, expected: string) {
  if (!provided || provided.length !== expected.length) return false;

  let diff = 0;
  for (let index = 0; index < expected.length; index += 1) {
    diff |= expected.charCodeAt(index) ^ provided.charCodeAt(index);
  }
  return diff === 0;
}

function readCookie(request: Request, name: string) {
  const cookie = request.headers.get("cookie");
  if (!cookie) return null;

  const prefix = `${name}=`;
  const value = cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length);

  return value ? decodeURIComponent(value) : null;
}
