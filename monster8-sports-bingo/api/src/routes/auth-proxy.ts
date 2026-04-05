import { Env } from "../types";
import { NOT_FOUND, INTERNAL_ERROR } from "../utils/errors";

/**
 * Proxy login/register/refresh/me requests to Monster #7's API.
 * OAuth is handled separately by auth-oauth.ts.
 */
export async function handleAuthProxyRoutes(
  request: Request,
  env: Env,
): Promise<Response> {
  const path = new URL(request.url).pathname;

  const authApiUrl = env.AUTH_API_URL;
  if (!authApiUrl) {
    return INTERNAL_ERROR("AUTH_API_URL not configured");
  }

  // POST: login, register, refresh
  if (request.method === "POST" && ["/api/auth/login", "/api/auth/register", "/api/auth/refresh"].includes(path)) {
    return proxy(request, path, authApiUrl, "POST");
  }

  // GET: /api/users/me
  if (request.method === "GET" && path === "/api/users/me") {
    return proxy(request, path, authApiUrl, "GET");
  }

  return NOT_FOUND();
}

async function proxy(
  request: Request,
  path: string,
  authApiUrl: string,
  method: string,
): Promise<Response> {
  try {
    const headers = new Headers();
    headers.set("Content-Type", "application/json");

    const authHeader = request.headers.get("Authorization");
    if (authHeader) headers.set("Authorization", authHeader);

    const init: RequestInit = { method, headers };
    if (method === "POST") {
      init.body = await request.text();
    }

    const res = await fetch(`${authApiUrl}${path}`, init);
    const body = await res.text();

    return new Response(body, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Auth proxy error:", err);
    return INTERNAL_ERROR("Auth service unavailable");
  }
}
