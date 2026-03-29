import { Env } from "../types";

const CORS_HEADERS = {
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

export function handleCors(request: Request, env: Env): Response | null {
  const origin = request.headers.get("Origin") ?? "";
  const allowed = env.CORS_ORIGIN;

  if (request.method === "OPTIONS") {
    const headers: Record<string, string> = { ...CORS_HEADERS };
    if (origin === allowed) {
      headers["Access-Control-Allow-Origin"] = origin;
    }
    return new Response(null, { status: 204, headers });
  }

  // Non-preflight: return null to let the route handler continue
  return null;
}

export function withCorsHeaders(response: Response, env: Env, request: Request): Response {
  const origin = request.headers.get("Origin") ?? "";
  const allowed = env.CORS_ORIGIN;

  if (origin !== allowed) {
    return response;
  }

  const newResponse = new Response(response.body, response);
  newResponse.headers.set("Access-Control-Allow-Origin", origin);
  return newResponse;
}
