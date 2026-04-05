import { Env } from "../types";
import { DrawResult } from "./draw-engine";
import {
  judgeStar,
  judgeBigSmall,
  judgeOddEven,
  judgeSuper,
  BET_AMOUNT_CENTS,
} from "./odds-engine";

interface BetRow {
  id: string;
  user_id: string;
  play_type: string;
  selected_numbers: string;
  selected_side: string | null;
  multiplier: number;
  unit_count: number;
}

/**
 * Settle all pending bets for a given round.
 *
 * Uses env.DB.batch() for atomic execution:
 *  - UPDATE each bet with result
 *  - UPDATE winning wallets
 *  - INSERT transaction records
 */
export async function settleBets(
  env: Env,
  roundId: string,
  draw: DrawResult,
): Promise<{ settled: number; winners: number; totalPayout: number }> {
  // Get all pending bets for this round
  const betsResult = await env.DB.prepare(
    "SELECT id, user_id, play_type, selected_numbers, selected_side, multiplier, unit_count FROM bets WHERE round_id = ? AND status = 'pending'",
  )
    .bind(roundId)
    .all<BetRow>();

  const bets = betsResult.results;
  if (bets.length === 0) {
    return { settled: 0, winners: 0, totalPayout: 0 };
  }

  const statements: D1PreparedStatement[] = [];
  let winners = 0;
  let totalPayout = 0;

  // Group payouts by user for wallet updates
  const userPayouts: Record<string, number> = {};

  for (const bet of bets) {
    const selectedNumbers: number[] = JSON.parse(bet.selected_numbers);
    const result = judgeBet(
      bet.play_type,
      selectedNumbers,
      bet.selected_side,
      draw,
    );

    // payout = payoutPerUnit * multiplier
    // For super play, payoutPerUnit already accounts for per-unit;
    // unit_count means how many numbers selected — only 1 can match.
    const finalPayout = result.won
      ? result.payoutPerUnit * bet.multiplier
      : 0;

    const status = result.won ? "won" : "lost";

    statements.push(
      env.DB.prepare(
        "UPDATE bets SET matched_count = ?, payout_multiplier = ?, payout_amount = ?, status = ?, settled_at = CURRENT_TIMESTAMP WHERE id = ?",
      ).bind(
        result.matchedCount,
        result.multiplier,
        finalPayout,
        status,
        bet.id,
      ),
    );

    if (result.won) {
      winners++;
      totalPayout += finalPayout;
      userPayouts[bet.user_id] = (userPayouts[bet.user_id] || 0) + finalPayout;
    }
  }

  // Update wallets and create transactions for winners
  for (const [userId, payout] of Object.entries(userPayouts)) {
    const wallet = await env.DB.prepare(
      "SELECT id, balance FROM wallets WHERE user_id = ?",
    )
      .bind(userId)
      .first<{ id: string; balance: number }>();

    if (wallet) {
      const newBalance = wallet.balance + payout;
      const txnId = crypto.randomUUID();

      statements.push(
        env.DB.prepare(
          "UPDATE wallets SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        ).bind(newBalance, wallet.id),
        env.DB.prepare(
          "INSERT INTO transactions (id, wallet_id, type, amount, balance_after, ref_type, ref_id, description) VALUES (?, ?, 'payout', ?, ?, 'round', ?, ?)",
        ).bind(
          txnId,
          wallet.id,
          payout,
          newBalance,
          roundId,
          `Round ${roundId} payout: ${payout / 100} TWD`,
        ),
      );
    }
  }

  // Execute all in a single atomic batch
  if (statements.length > 0) {
    await env.DB.batch(statements);
  }

  return { settled: bets.length, winners, totalPayout };
}

function judgeBet(
  playType: string,
  selectedNumbers: number[],
  selectedSide: string | null,
  draw: DrawResult,
) {
  const starMatch = playType.match(/^star_(\d+)$/);
  if (starMatch) {
    return judgeStar(selectedNumbers, draw.numbers, parseInt(starMatch[1]));
  }

  if (playType === "big_small" && selectedSide) {
    return judgeBigSmall(
      draw.numbers,
      selectedSide as "big" | "small",
    );
  }

  if (playType === "odd_even" && selectedSide) {
    return judgeOddEven(
      draw.numbers,
      selectedSide as "odd" | "even",
    );
  }

  if (playType === "super") {
    return judgeSuper(selectedNumbers, draw.superNumber);
  }

  return { won: false, matchedCount: 0, multiplier: 0, payoutPerUnit: 0 };
}
