import { Env } from "../types";
import { CryptoRandomSource } from "../services/random-source";
import {
  drawNumbers,
  getTaiwanNow,
  isDrawTime,
  computeRoundId,
  roundIdToDrawTime,
} from "../services/draw-engine";
import { settleBets } from "../services/settlement";

/**
 * Cron trigger handler — runs every 5 minutes.
 *
 * Flow:
 *  1. Get current Taiwan time
 *  2. Validate it's within business hours (07:05-23:55)
 *  3. Compute round_id
 *  4. Idempotency check (skip if already drawn)
 *  5. Draw 20 numbers
 *  6. Save to DB
 *  7. Settle bets (Phase 7)
 *  8. Update KV cache
 */
export async function handleDrawCron(env: Env): Promise<void> {
  const taiwanNow = getTaiwanNow();

  // Step 1: Validate business hours
  if (!isDrawTime(taiwanNow)) {
    console.log(
      `[Cron] Outside business hours: ${taiwanNow.toISOString()} (Taiwan)`,
    );
    return;
  }

  // Step 2: Compute round_id
  const roundId = computeRoundId(taiwanNow);
  const drawTime = roundIdToDrawTime(roundId);

  console.log(`[Cron] Processing round ${roundId} at ${drawTime}`);

  // Step 3: Idempotency check
  const existing = await env.DB.prepare(
    "SELECT id, status FROM draw_rounds WHERE round_id = ?",
  )
    .bind(roundId)
    .first<{ id: number; status: string }>();

  if (existing && existing.status !== "pending") {
    console.log(`[Cron] Round ${roundId} already processed (${existing.status})`);
    return;
  }

  // Step 4: Draw numbers
  const source = new CryptoRandomSource();
  const result = drawNumbers(source);

  console.log(
    `[Cron] Drew numbers for ${roundId}: [${result.numbers.join(",")}], super=${result.superNumber}`,
  );

  // Step 5: Save to DB
  if (existing) {
    // Update existing pending round
    await env.DB.prepare(
      "UPDATE draw_rounds SET numbers = ?, super_number = ?, status = 'drawn' WHERE round_id = ?",
    )
      .bind(JSON.stringify(result.numbers), result.superNumber, roundId)
      .run();
  } else {
    // Insert new round
    await env.DB.prepare(
      "INSERT INTO draw_rounds (round_id, draw_time, numbers, super_number, status) VALUES (?, ?, ?, ?, 'drawn')",
    )
      .bind(
        roundId,
        drawTime,
        JSON.stringify(result.numbers),
        result.superNumber,
      )
      .run();
  }

  // Step 6: Settle bets
  const settlement = await settleBets(env, roundId, result);
  console.log(
    `[Cron] Settled ${settlement.settled} bets, ${settlement.winners} winners, total payout: ${settlement.totalPayout / 100} TWD`,
  );

  // Step 7: Update round to settled
  await env.DB.prepare(
    "UPDATE draw_rounds SET status = 'settled' WHERE round_id = ?",
  )
    .bind(roundId)
    .run();

  // Step 8: Update KV cache for fast frontend reads
  await updateDrawCache(env, roundId, result, drawTime);

  console.log(`[Cron] Round ${roundId} completed`);
}

async function updateDrawCache(
  env: Env,
  roundId: string,
  result: { numbers: number[]; superNumber: number },
  drawTime: string,
): Promise<void> {
  const latestResult = {
    round_id: roundId,
    draw_time: drawTime,
    numbers: result.numbers,
    super_number: result.superNumber,
  };

  await Promise.all([
    env.KV.put("bingo:latest_result", JSON.stringify(latestResult), {
      expirationTtl: 300,
    }),
    env.KV.put(
      "bingo:current_round",
      JSON.stringify({
        round_id: roundId,
        draw_time: drawTime,
        server_time: new Date().toISOString(),
      }),
      { expirationTtl: 60 },
    ),
  ]);
}
