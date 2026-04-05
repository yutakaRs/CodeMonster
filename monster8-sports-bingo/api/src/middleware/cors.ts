import { Env } from "../types";

const CORS_HEADERS = {
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

export function handleCors(request: Request, env: Env): Response | null {
  const origin = request.headers.get("Origin") || "";

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        ...CORS_HEADERS,
        "Access-Control-Allow-Origin": origin === env.CORS_ORIGIN ? origin : "",
      },
    });
  }

  return null;
}

export function addCorsHeaders(
  response: Response,
  request: Request,
  env: Env,
): Response {
  const origin = request.headers.get("Origin") || "";
  if (origin !== env.CORS_ORIGIN) return response;

  const newResponse = new Response(response.body, response);
  newResponse.headers.set("Access-Control-Allow-Origin", origin);
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    newResponse.headers.set(key, value);
  }
  return newResponse;
}
