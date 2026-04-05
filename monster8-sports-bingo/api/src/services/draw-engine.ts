import { RandomSource } from "./random-source";

export interface DrawResult {
  numbers: number[];      // 20 numbers in draw order
  superNumber: number;    // = numbers[19] (the 20th drawn number)
}

/**
 * Unbiased random index in [0, max) using rejection sampling.
 *
 * Problem: A random byte (0-255) mod N introduces modulo bias when 256 is
 * not a multiple of N. For example, 256 mod 80 = 16, so values 0-15 have a
 * slightly higher chance of appearing.
 *
 * Solution: Reject any byte >= floor(256/N)*N, then take byte % N.
 * This ensures every value in [0, N) is equally likely.
 */
function unbiasedRandomIndex(max: number, source: RandomSource): number {
  const limit = Math.floor(256 / max) * max; // largest multiple of max <= 256

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const byte = source.getRandomBytes(1)[0];
    if (byte < limit) {
      return byte % max;
    }
    // Reject and retry — expected ~1.25 tries for max=80
  }
}

/**
 * Draw 20 unique numbers from 1-80 using Fisher-Yates shuffle.
 *
 * Algorithm:
 * 1. Create candidate array [1, 2, ..., 80]
 * 2. For i from 79 down to 60 (only need 20 picks):
 *    - Pick random j in [0, i]
 *    - Swap candidates[i] and candidates[j]
 * 3. Take candidates[60..79] as the 20 drawn numbers
 *
 * This is a partial Fisher-Yates — we only shuffle the last 20 positions.
 * The order of drawn numbers is preserved (order matters for super number).
 */
export function drawNumbers(source: RandomSource): DrawResult {
  const candidates = Array.from({ length: 80 }, (_, i) => i + 1);

  // Partial Fisher-Yates: shuffle last 20 positions
  for (let i = 79; i >= 60; i--) {
    const j = unbiasedRandomIndex(i + 1, source);
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  // Take the last 20 elements in their shuffled order
  const numbers = candidates.slice(60);
  const superNumber = numbers[19]; // The 20th drawn number

  return { numbers, superNumber };
}

// ─── Round ID Utilities ───────────────────────────────

/**
 * Convert Taiwan time (UTC+8) to round_id in YYYYMMDDNNN format.
 *
 * Period formula:
 *   minutes_from_start = (hour * 60 + minute) - (7 * 60 + 5)
 *   period = minutes_from_start / 5 + 1
 *
 * 07:05 = period 001, 07:10 = period 002, ..., 23:55 = period 203
 */
export function computeRoundId(taiwanDate: Date): string {
  const year = taiwanDate.getUTCFullYear();
  const month = String(taiwanDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(taiwanDate.getUTCDate()).padStart(2, "0");
  const hour = taiwanDate.getUTCHours();
  const minute = taiwanDate.getUTCMinutes();

  const minutesFromStart = hour * 60 + minute - 425; // 425 = 7*60+5
  const period = Math.floor(minutesFromStart / 5) + 1;

  return `${year}${month}${day}${String(period).padStart(3, "0")}`;
}

/**
 * Get current Taiwan time (UTC+8) as a Date object.
 * The returned Date's UTC methods give Taiwan local time values.
 */
export function getTaiwanNow(): Date {
  return new Date(Date.now() + 8 * 60 * 60 * 1000);
}

/**
 * Check if a Taiwan time is within business hours (07:05 - 23:55).
 * Also validates the minute is on a 5-minute boundary.
 */
export function isDrawTime(taiwanDate: Date): boolean {
  const hour = taiwanDate.getUTCHours();
  const minute = taiwanDate.getUTCMinutes();
  const totalMinutes = hour * 60 + minute;

  // Business hours: 07:05 (425) to 23:55 (1435)
  if (totalMinutes < 425 || totalMinutes > 1435) return false;

  // Must be on 5-minute boundary (xx:05, xx:10, ..., xx:55)
  if (minute % 5 !== 0) return false;

  return true;
}

/**
 * Compute draw_time ISO string for a given round_id.
 */
export function roundIdToDrawTime(roundId: string): string {
  const year = parseInt(roundId.slice(0, 4));
  const month = parseInt(roundId.slice(4, 6)) - 1;
  const day = parseInt(roundId.slice(6, 8));
  const period = parseInt(roundId.slice(8, 11));

  const minutesFromStart = (period - 1) * 5;
  const totalMinutes = 425 + minutesFromStart; // 425 = 7*60+5
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;

  // Create Taiwan time, then convert back to UTC
  const taiwanTime = new Date(Date.UTC(year, month, day, hour, minute, 0, 0));
  const utcTime = new Date(taiwanTime.getTime() - 8 * 60 * 60 * 1000);

  return utcTime.toISOString();
}
