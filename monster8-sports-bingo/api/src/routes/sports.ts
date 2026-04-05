import { Env } from "../types";
import { KvCache } from "../services/kv-cache";
import { SportsApiClient } from "../services/sports-api-client";
import { NOT_FOUND, INTERNAL_ERROR } from "../utils/errors";

// TTL constants (seconds)
const TTL_SPORTS = 86400;    // 24 hours
const TTL_LEAGUES = 86400;   // 24 hours
const TTL_TEAMS = 86400;     // 24 hours
const TTL_EVENTS = 3600;     // 1 hour
const TTL_EVENT = 900;       // 15 minutes

function cacheHeader(response: Response, cacheStatus: string): Response {
  const newResponse = new Response(response.body, response);
  newResponse.headers.set("X-Cache", cacheStatus);
  return newResponse;
}

export async function handleSportsRoutes(
  request: Request,
  env: Env,
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  if (method !== "GET") {
    return NOT_FOUND("Method not allowed");
  }

  const cache = new KvCache(env.KV);
  const client = new SportsApiClient({ apiKey: env.SPORTSGAMEODDS_API_KEY });

  try {
    // GET /api/sports — list all sports
    if (path === "/api/sports") {
      const key = "sports_api:sports";
      const result = await cache.get(key, TTL_SPORTS, () => client.sports());
      return cacheHeader(
        Response.json({ data: result.data }),
        result.cacheStatus,
      );
    }

    // GET /api/sports/leagues — list leagues
    if (path === "/api/sports/leagues") {
      const params = Object.fromEntries(url.searchParams);
      const key = KvCache.buildKey("sports_api:leagues", params);
      const result = await cache.get(key, TTL_LEAGUES, () =>
        client.leagues(params),
      );
      return cacheHeader(
        Response.json({ data: result.data }),
        result.cacheStatus,
      );
    }

    // GET /api/sports/teams — list teams
    if (path === "/api/sports/teams") {
      const params = Object.fromEntries(url.searchParams);
      const key = KvCache.buildKey("sports_api:teams", params);
      const result = await cache.get(key, TTL_TEAMS, () =>
        client.teams(params),
      );
      return cacheHeader(
        Response.json({ data: result.data }),
        result.cacheStatus,
      );
    }

    // GET /api/sports/events/:eventId
    const eventMatch = path.match(/^\/api\/sports\/events\/([^/]+)$/);
    if (eventMatch) {
      const eventId = eventMatch[1];
      const key = `sports_api:event:${eventId}`;
      const result = await cache.get(key, TTL_EVENT, () =>
        client.events({ eventID: eventId }),
      );
      return cacheHeader(
        Response.json({ data: result.data }),
        result.cacheStatus,
      );
    }

    // GET /api/sports/events — list events
    if (path === "/api/sports/events") {
      const params = Object.fromEntries(url.searchParams);
      const key = KvCache.buildKey("sports_api:events", params);
      const result = await cache.get(key, TTL_EVENTS, () =>
        client.events(params),
      );
      return cacheHeader(
        Response.json({ data: result.data }),
        result.cacheStatus,
      );
    }

    return NOT_FOUND();
  } catch (err) {
    console.error("Sports route error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to fetch sports data";
    return INTERNAL_ERROR(message);
  }
}
