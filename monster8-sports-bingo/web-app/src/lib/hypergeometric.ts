/**
 * Hypergeometric distribution for Bingo Bingo probability calculation.
 *
 * Model: 80 balls total, 20 drawn, player picks n balls.
 * P(X=k) = C(20,k) * C(60, n-k) / C(80, n)
 *
 * Where C(n,r) = n! / (r! * (n-r)!)
 */

const N = 80;  // total balls
const K = 20;  // drawn per round
const REST = N - K; // 60

// Log-factorial lookup table for C(n,r) computation (avoids overflow)
const logFact: number[] = [0];
for (let i = 1; i <= N; i++) {
  logFact[i] = logFact[i - 1] + Math.log(i);
}

function logC(n: number, r: number): number {
  if (r < 0 || r > n) return -Infinity;
  return logFact[n] - logFact[r] - logFact[n - r];
}

/**
 * P(exactly k matches | picked n numbers)
 */
export function hypergeometricPmf(n: number, k: number): number {
  if (k < 0 || k > Math.min(n, K) || (n - k) > REST) return 0;
  const logP = logC(K, k) + logC(REST, n - k) - logC(N, n);
  return Math.exp(logP);
}

/**
 * Get all probabilities for a star play (picking n numbers).
 * Returns array of { matched, probability, percentage }
 */
export function getStarProbabilities(n: number): { matched: number; probability: number; percentage: string }[] {
  const result: { matched: number; probability: number; percentage: string }[] = [];
  for (let k = Math.min(n, K); k >= 0; k--) {
    const p = hypergeometricPmf(n, k);
    if (p > 0) {
      result.push({
        matched: k,
        probability: p,
        percentage: p >= 0.01 ? `${(p * 100).toFixed(2)}%` : p >= 0.0001 ? `${(p * 100).toFixed(4)}%` : `1/${Math.round(1 / p)}`,
      });
    }
  }
  return result;
}

/**
 * Big/Small or Odd/Even: probability that one side has >= 13 out of 20.
 * P(big >= 13) = sum of P(X=k) for k=13..20 where X ~ Hypergeometric(80, 40, 20)
 */
export function getBigSmallProbability(): { probability: number; percentage: string } {
  let p = 0;
  for (let k = 13; k <= 20; k++) {
    // C(40,k) * C(40, 20-k) / C(80, 20)
    const logP = logC(40, k) + logC(40, 20 - k) - logC(N, K);
    p += Math.exp(logP);
  }
  return { probability: p, percentage: `${(p * 100).toFixed(2)}%` };
}

/**
 * Super number: probability = 1/80 per selected number
 */
export function getSuperProbability(): { probability: number; percentage: string } {
  return { probability: 1 / 80, percentage: "1.25%" };
}
