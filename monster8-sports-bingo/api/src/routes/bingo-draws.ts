import { Env } from "../types";
import {
  getTaiwanNow,
  computeRoundId,
  roundIdToDrawTime,
} from "../services/draw-engine";
import { NOT_FOUND, BAD_REQUEST } from "../utils/errors";

export async function handleBingoDrawRoutes(
  request: Request,
  env: Env,
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  if (request.method !== "GET") {
    return NOT_FOUND("Method not allowed");
  }

  // GET /api/bingo/draws/current ��� current round info + countdown
  if (path === "/api/bingo/draws/current") {
    return handleCurrentRound(env);
  }

  // GET /api/bingo/draws/latest — latest N draw results
  if (path === "/api/bingo/draws/latest") {
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "10"), 50);
    return handleLatestDraws(env, limit);
  }

  // GET /api/bingo/draws/history — paginated history
  if (path === "/api/bingo/draws/history") {
    const page = Math.max(parseInt(url.searchParams.get("page") || "1"), 1);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 50);
    return handleDrawHistory(env, page, limit);
  }

  // GET /api/bingo/draws/:roundId — specific draw result
  const roundMatch = path.match(/^\/api\/bingo\/draws\/(\d{11})$/);
  if (roundMatch) {
    return handleDrawByRoundId(env, roundMatch[1]);
  }

  return NOT_FOUND();
}

async function handleCurrentRound(env: Env): Promise<Response> {
  const taiwanNow = getTaiwanNow();
  const nowMinutes =
    taiwanNow.getUTCHours() * 60 + taiwanNow.getUTCMinutes();

  // Find the next draw time (in total minutes of day, Taiwan time)
  let nextDrawMinutes: number;
  let addDay = false;

  if (nowMinutes < 425) {
    // Before 07:05 — next draw is 07:05 today
    nextDrawMinutes = 425;
  } else if (nowMinutes >= 1435) {
    // After 23:55 — next draw is tomorrow 07:05
    nextDrawMinutes = 425;
    addDay = true;
  } else {
    // During business hours — next 5-minute mark
    nextDrawMinutes = Math.ceil((nowMinutes + 1) / 5) * 5;
    if (nextDrawMinutes > 1435) {
      nextDrawMinutes = 425;
      addDay = true;
    }
  }

  const secondsUntilDraw = addDay
    ? (1440 - nowMinutes + nextDrawMinutes) * 60 - taiwanNow.getUTCSeconds()
    : (nextDrawMinutes - nowMinutes) * 60 - taiwanNow.getUTCSeconds();

  // Build next draw date with correct hours/minutes
  const nextHour = Math.floor(nextDrawMinutes / 60);
  const nextMinute = nextDrawMinutes % 60;
  const nextDrawDate = new Date(taiwanNow.getTime());
  nextDrawDate.setUTCHours(nextHour, nextMinute, 0, 0);
  if (addDay) {
    nextDrawDate.setUTCDate(nextDrawDate.getUTCDate() + 1);
  }

  const roundId = computeRoundId(nextDrawDate);
  const drawTime = roundIdToDrawTime(roundId);

  // Get the most recent draw result
  const lastDraw = await env.DB.prepare(
    "SELECT round_id, draw_time, numbers, super_number, status FROM draw_rounds WHERE status IN ('drawn', 'settled') ORDER BY draw_time DESC LIMIT 1",
  ).first<{
    round_id: string;
    draw_time: string;
    numbers: string;
    super_number: number;
    status: string;
  }>();

  return Response.json({
    data: {
      next_round: {
        round_id: roundId,
        draw_time: drawTime,
        seconds_until_draw: Math.max(0, secondsUntilDraw),
      },
      last_draw: lastDraw
        ? {
            round_id: lastDraw.round_id,
            draw_time: lastDraw.draw_time,
            numbers: JSON.parse(lastDraw.numbers),
            super_number: lastDraw.super_number,
            status: lastDraw.status,
          }
        : null,
      server_time: new Date().toISOString(),
    },
  });
}

async function handleLatestDraws(env: Env, limit: number): Promise<Response> {
  const draws = await env.DB.prepare(
    "SELECT round_id, draw_time, numbers, super_number, status FROM draw_rounds WHERE status IN ('drawn', 'settled') ORDER BY draw_time DESC LIMIT ?",
  )
    .bind(limit)
    .all<{
      round_id: string;
      draw_time: string;
      numbers: string;
      super_number: number;
      status: string;
    }>();

  return Response.json({
    data: draws.results.map((d) => ({
      ...d,
      numbers: JSON.parse(d.numbers),
    })),
  });
}

async function handleDrawHistory(
  env: Env,
  page: number,
  limit: number,
): Promise<Response> {
  const offset = (page - 1) * limit;

  const [draws, countResult] = await Promise.all([
    env.DB.prepare(
      "SELECT round_id, draw_time, numbers, super_number, status FROM draw_rounds WHERE status IN ('drawn', 'settled') ORDER BY draw_time DESC LIMIT ? OFFSET ?",
    )
      .bind(limit, offset)
      .all<{
        round_id: string;
        draw_time: string;
        numbers: string;
        super_number: number;
        status: string;
      }>(),
    env.DB.prepare(
      "SELECT COUNT(*) as total FROM draw_rounds WHERE status IN ('drawn', 'settled')",
    ).first<{ total: number }>(),
  ]);

  const total = countResult?.total || 0;

  return Response.json({
    data: draws.results.map((d) => ({
      ...d,
      numbers: JSON.parse(d.numbers),
    })),
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    },
  });
}

async function handleDrawByRoundId(
  env: Env,
  roundId: string,
): Promise<Response> {
  if (!/^\d{11}$/.test(roundId)) {
    return BAD_REQUEST("Invalid round_id format. Expected YYYYMMDDNNN");
  }

  const draw = await env.DB.prepare(
    "SELECT round_id, draw_time, numbers, super_number, status, created_at FROM draw_rounds WHERE round_id = ?",
  )
    .bind(roundId)
    .first<{
      round_id: string;
      draw_time: string;
      numbers: string;
      super_number: number;
      status: string;
      created_at: string;
    }>();

  if (!draw) {
    return NOT_FOUND(`Round ${roundId} not found`);
  }

  return Response.json({
    data: {
      ...draw,
      numbers: JSON.parse(draw.numbers),
    },
  });
}
