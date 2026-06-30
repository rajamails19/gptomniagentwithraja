const DEVELOPER_API_TOKEN_ENV = "DEVELOPER_API_TOKEN";

export function isDeveloperApiPath(pathname: string) {
  return pathname.startsWith("/api/v1/developer/");
}

export function isDeveloperPagePath(pathname: string) {
  return pathname === "/developer/api" || pathname.startsWith("/developer/api/");
}

export function isDeveloperAccessAllowed(request: Request, url: URL) {
  const expectedToken = process.env[DEVELOPER_API_TOKEN_ENV]?.trim();
  if (!expectedToken) return false;

  const providedToken =
    request.headers.get("x-developer-token") ??
    url.searchParams.get("token") ??
    url.searchParams.get("developer_token") ??
    readCookie(request, "omniagents_developer_token") ??
    "";

  return timingSafeEqual(providedToken, expectedToken);
}

export function shouldSetDeveloperAccessCookie(url: URL) {
  return Boolean(url.searchParams.get("token") ?? url.searchParams.get("developer_token"));
}

export function setDeveloperAccessCookie(response: Response, url: URL) {
  const token = url.searchParams.get("token") ?? url.searchParams.get("developer_token");
  if (!token) return;
  response.headers.append(
    "set-cookie",
    `omniagents_developer_token=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`,
  );
}

export function developerAccessNotFoundResponse() {
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
