import { Env } from "./types";
import { handleCors, addCorsHeaders } from "./middleware/cors";
import { NOT_FOUND, INTERNAL_ERROR } from "./utils/errors";
import { handleSportsRoutes } from "./routes/sports";
import { handleBingoDrawRoutes } from "./routes/bingo-draws";
import { handleBingoBetRoutes } from "./routes/bingo-bets";
import { handleBingoWalletRoutes } from "./routes/bingo-wallet";
import { handleBingoStatsRoutes } from "./routes/bingo-stats";
import { handleAuthRoutes } from "./routes/auth";
import { handleOAuthRoutes } from "./routes/auth-oauth";
import { handleDrawCron } from "./cron/draw-cron";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const corsResponse = handleCors(request, env);
    if (corsResponse) return corsResponse;

    let response: Response;

    try {
      const url = new URL(request.url);
      const path = url.pathname;

      if (path === "/api/health" && request.method === "GET") {
        response = Response.json({
          data: {
            status: "ok",
            environment: env.ENVIRONMENT,
            timestamp: new Date().toISOString(),
          },
        });
      } else if (path.startsWith("/api/auth/oauth")) {
        response = await handleOAuthRoutes(request, env);
      } else if (path.startsWith("/api/auth") || path.startsWith("/api/users/me")) {
        response = await handleAuthRoutes(request, env);
      } else if (path.startsWith("/api/sports")) {
        response = await handleSportsRoutes(request, env);
      } else if (path.startsWith("/api/bingo/draws")) {
        response = await handleBingoDrawRoutes(request, env);
      } else if (path.startsWith("/api/bingo/stats")) {
        response = await handleBingoStatsRoutes(request, env);
      } else if (path.startsWith("/api/bingo/bets")) {
        response = await handleBingoBetRoutes(request, env);
      } else if (path.startsWith("/api/bingo/wallet")) {
        response = await handleBingoWalletRoutes(request, env);
      } else {
        response = NOT_FOUND();
      }
    } catch (err) {
      console.error("Unhandled error:", err);
      response = INTERNAL_ERROR();
    }

    return addCorsHeaders(response, request, env);
  },

  async scheduled(
    _controller: ScheduledController,
    env: Env,
    _ctx: ExecutionContext,
  ): Promise<void> {
    await handleDrawCron(env);
  },
} satisfies ExportedHandler<Env>;
