import { Env } from "../types";
import { NOT_FOUND } from "../utils/errors";

export async function handleBingoStatsRoutes(
  request: Request,
  env: Env,
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  if (request.method !== "GET") return NOT_FOUND();

  // GET /api/bingo/stats/frequency — number frequency
  if (path === "/api/bingo/stats/frequency") {
    const periods = Math.min(
      parseInt(url.searchParams.get("periods") || "50"),
      200,
    );
    return handleFrequency(env, periods);
  }

  // GET /api/bingo/stats/big-small — big/small ratio
  if (path === "/api/bingo/stats/big-small") {
    const periods = Math.min(
      parseInt(url.searchParams.get("periods") || "50"),
      200,
    );
    return handleBigSmallStats(env, periods);
  }

  // GET /api/bingo/stats/odd-even — odd/even ratio
  if (path === "/api/bingo/stats/odd-even") {
    const periods = Math.min(
      parseInt(url.searchParams.get("periods") || "50"),
      200,
    );
    return handleOddEvenStats(env, periods);
  }

  return NOT_FOUND();
}

async function getRecentDraws(
  env: Env,
  periods: number,
): Promise<number[][]> {
  const draws = await env.DB.prepare(
    "SELECT numbers FROM draw_rounds WHERE status IN ('drawn', 'settled') ORDER BY draw_time DESC LIMIT ?",
  )
    .bind(periods)
    .all<{ numbers: string }>();

  return draws.results.map((d) => JSON.parse(d.numbers) as number[]);
}

async function handleFrequency(env: Env, periods: number): Promise<Response> {
  const allDraws = await getRecentDraws(env, periods);

  // Count frequency of each number (1-80)
  const freq: Record<number, number> = {};
  for (let i = 1; i <= 80; i++) freq[i] = 0;
  for (const draw of allDraws) {
    for (const n of draw) freq[n]++;
  }

  // Sort by frequency for hot/cold display
  const sorted = Object.entries(freq)
    .map(([num, count]) => ({ number: Number(num), count }))
    .sort((a, b) => b.count - a.count);

  return Response.json({
    data: {
      periods_analyzed: allDraws.length,
      frequency: freq,
      hot: sorted.slice(0, 10),
      cold: sorted.slice(-10).reverse(),
    },
  });
}

async function handleBigSmallStats(
  env: Env,
  periods: number,
): Promise<Response> {
  const allDraws = await getRecentDraws(env, periods);

  let bigWins = 0;
  let smallWins = 0;
  let noWinner = 0;

  for (const draw of allDraws) {
    const bigCount = draw.filter((n) => n >= 41).length;
    if (bigCount >= 13) bigWins++;
    else if (bigCount <= 7) smallWins++;
    else noWinner++;
  }

  return Response.json({
    data: {
      periods_analyzed: allDraws.length,
      big: bigWins,
      small: smallWins,
      no_winner: noWinner,
    },
  });
}

async function handleOddEvenStats(
  env: Env,
  periods: number,
): Promise<Response> {
  const allDraws = await getRecentDraws(env, periods);

  let oddWins = 0;
  let evenWins = 0;
  let noWinner = 0;

  for (const draw of allDraws) {
    const oddCount = draw.filter((n) => n % 2 === 1).length;
    if (oddCount >= 13) oddWins++;
    else if (oddCount <= 7) evenWins++;
    else noWinner++;
  }

  return Response.json({
    data: {
      periods_analyzed: allDraws.length,
      odd: oddWins,
      even: evenWins,
      no_winner: noWinner,
    },
  });
}
