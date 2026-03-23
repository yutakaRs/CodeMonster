import { Env } from "./types";
import { errorResponse } from "./utils/errors";
import { handleCors, withCorsHeaders } from "./middleware/cors";
import { handleAuthRoutes } from "./routes/auth";
import { handleUserRoutes } from "./routes/users";
import { handleAdminRoutes } from "./routes/admin";

async function handleHealth(env: Env): Promise<Response> {
  let dbStatus = "ok";
  try {
    await env.DB.prepare("SELECT 1").first();
  } catch {
    dbStatus = "error";
  }

  return Response.json({
    status: dbStatus === "ok" ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    db: dbStatus,
  });
}

async function router(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // Health check (public, no CORS needed)
  if (path === "/health" && method === "GET") {
    return handleHealth(env);
  }

  // CORS preflight
  const corsResponse = handleCors(request, env);
  if (corsResponse) return corsResponse;

  // Serve R2 files (avatars)
  if (path.startsWith("/avatars/") && method === "GET") {
    const key = path.slice(1); // remove leading /
    const object = await env.BUCKET.get(key);
    if (!object) {
      return errorResponse("NOT_FOUND", "File not found", 404);
    }
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("Cache-Control", "public, max-age=3600");
    return withCorsHeaders(new Response(object.body, { headers }), env, request);
  }

  // Route to handlers
  let response: Response | null = null;

  if (path.startsWith("/api/auth/")) {
    response = await handleAuthRoutes(request, env, path);
  } else if (path.startsWith("/api/users/")) {
    response = await handleUserRoutes(request, env, path);
  } else if (path.startsWith("/api/admin/")) {
    response = await handleAdminRoutes(request, env, path);
  }

  if (!response) {
    response = errorResponse("NOT_FOUND", "Not found", 404);
  }

  return withCorsHeaders(response, env, request);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await router(request, env);
    } catch (e) {
      const url = new URL(request.url);
      console.error("Unhandled error:", { path: url.pathname, method: request.method, error: e });
      return errorResponse("INTERNAL_ERROR", "Internal server error", 500);
    }
  },
} satisfies ExportedHandler<Env>;
