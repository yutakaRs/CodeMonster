import { describe, it, expect, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import { applyMigrations, insertBet, insertWallet } from "./helpers";
import { settleBets } from "../src/services/settlement";
import { DrawResult } from "../src/services/draw-engine";
import { BET_AMOUNT_CENTS } from "../src/services/odds-engine";

const ROUND_ID = "20260405001";
const USER_ID = "user-1";
const WALLET_ID = "wallet-1";

// 20 drawn numbers; super number = numbers[19] = 80
const draw: DrawResult = {
  numbers: [3, 7, 12, 15, 22, 28, 33, 37, 41, 45, 50, 55, 60, 62, 68, 70, 73, 75, 78, 80],
  superNumber: 80,
};

describe("settleBets", () => {
  beforeEach(async () => {
    await applyMigrations(env.DB);
    // Clean tables between tests
    await env.DB.prepare("DELETE FROM bets").run();
    await env.DB.prepare("DELETE FROM transactions").run();
    await env.DB.prepare("DELETE FROM wallets").run();
  });

  it("star play settlement with multiplier", async () => {
    await insertWallet(env.DB, { id: WALLET_ID, userId: USER_ID, balance: 10000 });

    // 3-star bet on [3, 7, 12] — all 3 match → 20x multiplier
    // bet multiplier = 2, so payout = BET_AMOUNT_CENTS * 20 * 2
    await insertBet(env.DB, {
      id: "bet-star3",
      userId: USER_ID,
      roundId: ROUND_ID,
      playType: "star_3",
      selectedNumbers: [3, 7, 12],
      multiplier: 2,
    });

    const result = await settleBets(
      { DB: env.DB } as never,
      ROUND_ID,
      draw,
    );

    expect(result.settled).toBe(1);
    expect(result.winners).toBe(1);
    expect(result.totalPayout).toBe(BET_AMOUNT_CENTS * 20 * 2);

    // Verify bet row was updated
    const bet = await env.DB.prepare("SELECT status, payout_amount FROM bets WHERE id = ?")
      .bind("bet-star3")
      .first<{ status: string; payout_amount: number }>();
    expect(bet!.status).toBe("won");
    expect(bet!.payout_amount).toBe(BET_AMOUNT_CENTS * 20 * 2);

    // Verify wallet was credited
    const wallet = await env.DB.prepare("SELECT balance FROM wallets WHERE id = ?")
      .bind(WALLET_ID)
      .first<{ balance: number }>();
    expect(wallet!.balance).toBe(10000 + BET_AMOUNT_CENTS * 20 * 2);
  });

  it("big/small settlement", async () => {
    await insertWallet(env.DB, { id: WALLET_ID, userId: USER_ID, balance: 5000 });

    // In the draw: big numbers (>=41) are [41,45,50,55,60,62,68,70,73,75,78,80] = 12
    // small numbers (<= 40) are [3,7,12,15,22,28,33,37] = 8
    // Neither side >= 13, so nobody wins.
    await insertBet(env.DB, {
      id: "bet-big",
      userId: USER_ID,
      roundId: ROUND_ID,
      playType: "big_small",
      selectedNumbers: [],
      selectedSide: "big",
    });

    const result = await settleBets(
      { DB: env.DB } as never,
      ROUND_ID,
      draw,
    );

    expect(result.settled).toBe(1);
    expect(result.winners).toBe(0);
    expect(result.totalPayout).toBe(0);

    const bet = await env.DB.prepare("SELECT status FROM bets WHERE id = ?")
      .bind("bet-big")
      .first<{ status: string }>();
    expect(bet!.status).toBe("lost");
  });

  it("super number settlement", async () => {
    await insertWallet(env.DB, { id: WALLET_ID, userId: USER_ID, balance: 0 });

    // Super number is 80 — bet on [80] should win 48x
    await insertBet(env.DB, {
      id: "bet-super",
      userId: USER_ID,
      roundId: ROUND_ID,
      playType: "super",
      selectedNumbers: [80],
      multiplier: 1,
    });

    const result = await settleBets(
      { DB: env.DB } as never,
      ROUND_ID,
      draw,
    );

    expect(result.settled).toBe(1);
    expect(result.winners).toBe(1);
    expect(result.totalPayout).toBe(BET_AMOUNT_CENTS * 48);

    const bet = await env.DB.prepare("SELECT status, payout_amount FROM bets WHERE id = ?")
      .bind("bet-super")
      .first<{ status: string; payout_amount: number }>();
    expect(bet!.status).toBe("won");
    expect(bet!.payout_amount).toBe(BET_AMOUNT_CENTS * 48);
  });

  it("empty pending bets returns settled=0", async () => {
    const result = await settleBets(
      { DB: env.DB } as never,
      "20260405999",
      draw,
    );

    expect(result.settled).toBe(0);
    expect(result.winners).toBe(0);
    expect(result.totalPayout).toBe(0);
  });
});
