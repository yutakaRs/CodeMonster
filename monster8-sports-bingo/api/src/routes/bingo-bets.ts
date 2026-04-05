import { Env } from "../types";
import { authenticateRequest } from "../middleware/auth";
import { JwtPayload } from "../utils/jwt";
import { BAD_REQUEST, NOT_FOUND, INTERNAL_ERROR } from "../utils/errors";
import { getOrCreateWallet } from "./bingo-wallet";
import {
  getTaiwanNow,
  computeRoundId,
  roundIdToDrawTime,
  isDrawTime,
} from "../services/draw-engine";
import { BET_AMOUNT_CENTS } from "../services/odds-engine";

interface BetRequest {
  play_type: string;
  selected_numbers?: number[];
  selected_side?: string;
  selected_sides?: string[];
  multiplier?: number;
  periods?: number;
}

export async function handleBingoBetRoutes(
  request: Request,
  env: Env,
): Promise<Response> {
  const authResult = await authenticateRequest(request, env);
  if (authResult instanceof Response) return authResult;
  const user = authResult as JwtPayload;

  const url = new URL(request.url);
  const path = url.pathname;

  // POST /api/bingo/bets — place a bet
  if (path === "/api/bingo/bets" && request.method === "POST") {
    return handlePlaceBet(request, env, user.sub);
  }

  // GET /api/bingo/bets/mine — user's bet history
  if (path === "/api/bingo/bets/mine" && request.method === "GET") {
    const status = url.searchParams.get("status");
    const page = Math.max(parseInt(url.searchParams.get("page") || "1"), 1);
    const limit = Math.min(
      parseInt(url.searchParams.get("limit") || "20"),
      50,
    );
    return handleMyBets(env, user.sub, status, page, limit);
  }

  // GET /api/bingo/bets/:betId
  const betMatch = path.match(/^\/api\/bingo\/bets\/([a-f0-9-]+)$/);
  if (betMatch && request.method === "GET") {
    return handleGetBet(env, user.sub, betMatch[1]);
  }

  return NOT_FOUND();
}

async function handlePlaceBet(
  request: Request,
  env: Env,
  userId: string,
): Promise<Response> {
  const body = await request.json<BetRequest>();
  const {
    play_type,
    selected_numbers,
    selected_side,
    selected_sides,
    multiplier = 1,
    periods = 1,
  } = body;

  // Validate multiplier and periods
  if (multiplier < 1 || multiplier > 50) {
    return BAD_REQUEST("Multiplier must be between 1 and 50");
  }
  if (periods < 1 || periods > 12) {
    return BAD_REQUEST("Periods must be between 1 and 12");
  }

  // Validate play type and get unit_count
  const validation = validateBet(
    play_type,
    selected_numbers,
    selected_side,
    selected_sides,
  );
  if (validation.error) return BAD_REQUEST(validation.error);

  const { units, normalizedBets } = validation;

  // Calculate total cost
  const totalCostPerPeriod = BET_AMOUNT_CENTS * multiplier * units;
  const totalCost = totalCostPerPeriod * periods;

  // Check wallet balance
  const wallet = await getOrCreateWallet(env, userId);
  if (wallet.balance < totalCost) {
    return BAD_REQUEST(
      `Insufficient balance. Need ${totalCost / 100} TWD, have ${wallet.balance / 100} TWD`,
    );
  }

  // Check current round is open for betting
  const taiwanNow = getTaiwanNow();
  const nowMinutes = taiwanNow.getUTCHours() * 60 + taiwanNow.getUTCMinutes();

  // Find the next draw time (the round we're betting on)
  let nextDrawMinutes: number;
  if (nowMinutes < 425 || nowMinutes >= 1435) {
    return BAD_REQUEST("Betting is closed outside business hours (07:05 - 23:55 TST)");
  }
  nextDrawMinutes = Math.ceil(nowMinutes / 5) * 5;
  if (nextDrawMinutes <= nowMinutes) nextDrawMinutes += 5;
  if (nextDrawMinutes < 425) nextDrawMinutes = 425;

  // Generate bet rows for each period
  const statements: D1PreparedStatement[] = [];
  const betIds: string[] = [];

  for (let p = 0; p < periods; p++) {
    const drawMinutes = nextDrawMinutes + p * 5;
    if (drawMinutes > 1435) {
      return BAD_REQUEST(
        `Period ${p + 1} would exceed today's last draw (23:55). Reduce period count.`,
      );
    }

    // Build a temporary date for this period's round_id
    const periodDate = new Date(taiwanNow.getTime());
    periodDate.setUTCHours(Math.floor(drawMinutes / 60));
    periodDate.setUTCMinutes(drawMinutes % 60);
    const roundId = computeRoundId(periodDate);

    for (const bet of normalizedBets) {
      const betId = crypto.randomUUID();
      betIds.push(betId);

      statements.push(
        env.DB.prepare(
          "INSERT INTO bets (id, user_id, round_id, play_type, selected_numbers, selected_side, bet_amount, multiplier, unit_count, total_cost, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')",
        ).bind(
          betId,
          userId,
          roundId,
          bet.play_type,
          JSON.stringify(bet.selected_numbers),
          bet.selected_side,
          BET_AMOUNT_CENTS,
          multiplier,
          bet.unit_count,
          BET_AMOUNT_CENTS * multiplier * bet.unit_count,
        ),
      );
    }
  }

  // Deduct from wallet and record transaction
  const newBalance = wallet.balance - totalCost;
  const txnId = crypto.randomUUID();

  statements.push(
    env.DB.prepare(
      "UPDATE wallets SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    ).bind(newBalance, wallet.id),
    env.DB.prepare(
      "INSERT INTO transactions (id, wallet_id, type, amount, balance_after, ref_type, ref_id, description) VALUES (?, ?, 'bet', ?, ?, 'bet', ?, ?)",
    ).bind(
      txnId,
      wallet.id,
      -totalCost,
      newBalance,
      betIds[0],
      `Bet: ${play_type} x${multiplier} x${periods}期`,
    ),
  );

  await env.DB.batch(statements);

  return Response.json({
    data: {
      bet_ids: betIds,
      total_cost: totalCost,
      total_cost_display: `${totalCost / 100} TWD`,
      balance: newBalance,
      balance_display: `${newBalance / 100} TWD`,
    },
  });
}

interface ValidationResult {
  error?: string;
  units: number;
  normalizedBets: Array<{
    play_type: string;
    selected_numbers: number[];
    selected_side: string | null;
    unit_count: number;
  }>;
}

function validateBet(
  playType: string,
  selectedNumbers?: number[],
  selectedSide?: string,
  selectedSides?: string[],
): ValidationResult {
  // Star plays: star_1 through star_10
  const starMatch = playType.match(/^star_(\d+)$/);
  if (starMatch) {
    const starCount = parseInt(starMatch[1]);
    if (starCount < 1 || starCount > 10) {
      return { error: "Star count must be 1-10", units: 0, normalizedBets: [] };
    }
    if (!selectedNumbers || selectedNumbers.length !== starCount) {
      return {
        error: `Star ${starCount} requires exactly ${starCount} numbers`,
        units: 0,
        normalizedBets: [],
      };
    }
    if (!validateNumbers(selectedNumbers)) {
      return {
        error: "Numbers must be unique integers in 1-80",
        units: 0,
        normalizedBets: [],
      };
    }
    return {
      units: 1,
      normalizedBets: [
        {
          play_type: playType,
          selected_numbers: selectedNumbers,
          selected_side: null,
          unit_count: 1,
        },
      ],
    };
  }

  // Big/Small
  if (playType === "big_small") {
    const sides = selectedSides || (selectedSide ? [selectedSide] : []);
    if (sides.length === 0) {
      return { error: "Must select at least one side (big/small)", units: 0, normalizedBets: [] };
    }
    for (const s of sides) {
      if (s !== "big" && s !== "small") {
        return { error: `Invalid side: ${s}. Must be 'big' or 'small'`, units: 0, normalizedBets: [] };
      }
    }
    return {
      units: sides.length,
      normalizedBets: sides.map((s) => ({
        play_type: "big_small",
        selected_numbers: [],
        selected_side: s,
        unit_count: 1,
      })),
    };
  }

  // Odd/Even
  if (playType === "odd_even") {
    const sides = selectedSides || (selectedSide ? [selectedSide] : []);
    if (sides.length === 0) {
      return { error: "Must select at least one side (odd/even)", units: 0, normalizedBets: [] };
    }
    for (const s of sides) {
      if (s !== "odd" && s !== "even") {
        return { error: `Invalid side: ${s}. Must be 'odd' or 'even'`, units: 0, normalizedBets: [] };
      }
    }
    return {
      units: sides.length,
      normalizedBets: sides.map((s) => ({
        play_type: "odd_even",
        selected_numbers: [],
        selected_side: s,
        unit_count: 1,
      })),
    };
  }

  // Super number
  if (playType === "super") {
    if (
      !selectedNumbers ||
      selectedNumbers.length < 1 ||
      selectedNumbers.length > 20
    ) {
      return {
        error: "Super play requires 1-20 numbers",
        units: 0,
        normalizedBets: [],
      };
    }
    if (!validateNumbers(selectedNumbers)) {
      return {
        error: "Numbers must be unique integers in 1-80",
        units: 0,
        normalizedBets: [],
      };
    }
    return {
      units: selectedNumbers.length,
      normalizedBets: [
        {
          play_type: "super",
          selected_numbers: selectedNumbers,
          selected_side: null,
          unit_count: selectedNumbers.length,
        },
      ],
    };
  }

  return { error: `Unknown play type: ${playType}`, units: 0, normalizedBets: [] };
}

function validateNumbers(nums: number[]): boolean {
  if (new Set(nums).size !== nums.length) return false;
  return nums.every((n) => Number.isInteger(n) && n >= 1 && n <= 80);
}

async function handleMyBets(
  env: Env,
  userId: string,
  status: string | null,
  page: number,
  limit: number,
): Promise<Response> {
  const offset = (page - 1) * limit;

  let whereClause = "user_id = ?";
  const bindParams: (string | number)[] = [userId];

  if (status && ["pending", "won", "lost"].includes(status)) {
    whereClause += " AND status = ?";
    bindParams.push(status);
  }

  const [bets, countResult] = await Promise.all([
    env.DB.prepare(
      `SELECT id, round_id, play_type, selected_numbers, selected_side, bet_amount, multiplier, unit_count, total_cost, matched_count, payout_multiplier, payout_amount, status, settled_at, created_at FROM bets WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    )
      .bind(...bindParams, limit, offset)
      .all(),
    env.DB.prepare(
      `SELECT COUNT(*) as total FROM bets WHERE ${whereClause}`,
    )
      .bind(...bindParams)
      .first<{ total: number }>(),
  ]);

  const total = countResult?.total || 0;

  return Response.json({
    data: bets.results.map((b: Record<string, unknown>) => ({
      ...b,
      selected_numbers: JSON.parse(b.selected_numbers as string),
    })),
    pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
  });
}

async function handleGetBet(
  env: Env,
  userId: string,
  betId: string,
): Promise<Response> {
  const bet = await env.DB.prepare(
    "SELECT id, round_id, play_type, selected_numbers, selected_side, bet_amount, multiplier, unit_count, total_cost, matched_count, payout_multiplier, payout_amount, status, settled_at, created_at FROM bets WHERE id = ? AND user_id = ?",
  )
    .bind(betId, userId)
    .first();

  if (!bet) return NOT_FOUND("Bet not found");

  return Response.json({
    data: {
      ...bet,
      selected_numbers: JSON.parse(bet.selected_numbers as string),
    },
  });
}
