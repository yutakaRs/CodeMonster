/**
 * Bingo Bingo odds engine — payout tables and win determination.
 *
 * All rules follow Taiwan Lottery official Bingo Bingo specification.
 * https://www.taiwanlotter.com/lotto/info/bingo_bingo/
 */

// ─── Payout Tables ────────────────────────────────────

/**
 * Star play payout table.
 * Key: star count (1-10)
 * Value: map of matched_count → multiplier
 *
 * Special rules:
 * - 8/9/10 star: matching 0 numbers also wins 1x
 */
export const STAR_PAYOUTS: Record<number, Record<number, number>> = {
  1: { 1: 2 },
  2: { 2: 3, 1: 1 },
  3: { 3: 20, 2: 2 },
  4: { 4: 40, 3: 4, 2: 1 },
  5: { 5: 300, 4: 20, 3: 2 },
  6: { 6: 1000, 5: 40, 4: 8, 3: 1 },
  7: { 7: 3200, 6: 120, 5: 12, 4: 2, 3: 1 },
  8: { 8: 20000, 7: 800, 6: 40, 5: 8, 4: 1, 0: 1 },
  9: { 9: 40000, 8: 4000, 7: 120, 6: 20, 5: 4, 4: 1, 0: 1 },
  10: { 10: 200000, 9: 10000, 8: 1000, 7: 100, 6: 10, 5: 1, 0: 1 },
};

export const BIG_SMALL_MULTIPLIER = 6;
export const ODD_EVEN_MULTIPLIER = 6;
export const SUPER_MULTIPLIER = 48;
export const BET_AMOUNT_CENTS = 2500; // 25 TWD

// ─── Judgment Results ─────────────────────────────────

export interface JudgmentResult {
  won: boolean;
  matchedCount: number;
  multiplier: number;
  payoutPerUnit: number; // in cents
}

// ─── Star Play Judgment ───────────────────────────────

export function judgeStar(
  selectedNumbers: number[],
  drawnNumbers: number[],
  starCount: number,
): JudgmentResult {
  const drawnSet = new Set(drawnNumbers);
  const matchedCount = selectedNumbers.filter((n) => drawnSet.has(n)).length;

  const payoutTable = STAR_PAYOUTS[starCount];
  if (!payoutTable) {
    return { won: false, matchedCount, multiplier: 0, payoutPerUnit: 0 };
  }

  const multiplier = payoutTable[matchedCount] ?? 0;
  const won = multiplier > 0;

  return {
    won,
    matchedCount,
    multiplier,
    payoutPerUnit: won ? BET_AMOUNT_CENTS * multiplier : 0,
  };
}

// ─── Big / Small Judgment ─────────────────────────────

/**
 * Count how many drawn numbers are in [41-80] (big) vs [1-40] (small).
 * Win condition: one side has >= 13 numbers.
 * If neither side has >= 13, nobody wins.
 */
export function judgeBigSmall(
  drawnNumbers: number[],
  selectedSide: "big" | "small",
): JudgmentResult {
  const bigCount = drawnNumbers.filter((n) => n >= 41).length;
  const smallCount = 20 - bigCount;

  let winSide: "big" | "small" | null = null;
  if (bigCount >= 13) winSide = "big";
  else if (smallCount >= 13) winSide = "small";

  const won = winSide === selectedSide;
  const matchedCount = selectedSide === "big" ? bigCount : smallCount;

  return {
    won,
    matchedCount,
    multiplier: won ? BIG_SMALL_MULTIPLIER : 0,
    payoutPerUnit: won ? BET_AMOUNT_CENTS * BIG_SMALL_MULTIPLIER : 0,
  };
}

// ─── Odd / Even Judgment ──────────────────────────────

/**
 * Count how many drawn numbers are odd vs even.
 * Win condition: one side has >= 13 numbers.
 * If neither side has >= 13, nobody wins.
 */
export function judgeOddEven(
  drawnNumbers: number[],
  selectedSide: "odd" | "even",
): JudgmentResult {
  const oddCount = drawnNumbers.filter((n) => n % 2 === 1).length;
  const evenCount = 20 - oddCount;

  let winSide: "odd" | "even" | null = null;
  if (oddCount >= 13) winSide = "odd";
  else if (evenCount >= 13) winSide = "even";

  const won = winSide === selectedSide;
  const matchedCount = selectedSide === "odd" ? oddCount : evenCount;

  return {
    won,
    matchedCount,
    multiplier: won ? ODD_EVEN_MULTIPLIER : 0,
    payoutPerUnit: won ? BET_AMOUNT_CENTS * ODD_EVEN_MULTIPLIER : 0,
  };
}

// ─── Super Number Judgment ────────────────────────────

/**
 * Super number is the 20th drawn number.
 * Independent play — not a bonus for star plays.
 * Each selected number is a separate unit.
 */
export function judgeSuper(
  selectedNumbers: number[],
  superNumber: number,
): JudgmentResult {
  const matchedCount = selectedNumbers.filter((n) => n === superNumber).length;
  const won = matchedCount > 0;

  return {
    won,
    matchedCount,
    multiplier: won ? SUPER_MULTIPLIER : 0,
    payoutPerUnit: won ? BET_AMOUNT_CENTS * SUPER_MULTIPLIER : 0,
  };
}
