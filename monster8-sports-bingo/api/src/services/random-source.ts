/**
 * RandomSource abstraction — injectable randomness for testability.
 *
 * PROD: CryptoRandomSource (crypto.getRandomValues — true random, no bias)
 * TEST: SeededRandomSource (deterministic PRNG — same seed = same output)
 */
export interface RandomSource {
  getRandomBytes(count: number): Uint8Array;
}

/**
 * Production random source using Web Crypto API.
 * Cryptographically secure — no bias, no predictability.
 */
export class CryptoRandomSource implements RandomSource {
  getRandomBytes(count: number): Uint8Array {
    const bytes = new Uint8Array(count);
    crypto.getRandomValues(bytes);
    return bytes;
  }
}

/**
 * Seeded PRNG for testing — deterministic output from a given seed.
 * Uses xoshiro128** algorithm.
 *
 * IMPORTANT: This is NOT cryptographically secure. Only for tests.
 */
export class SeededRandomSource implements RandomSource {
  private s: Uint32Array;

  constructor(seed: number) {
    // Initialize state from seed using splitmix32
    this.s = new Uint32Array(4);
    let z = seed | 0;
    for (let i = 0; i < 4; i++) {
      z = (z + 0x9e3779b9) | 0;
      let t = z ^ (z >>> 16);
      t = Math.imul(t, 0x21f0aaad);
      t = t ^ (t >>> 15);
      t = Math.imul(t, 0x735a2d97);
      t = t ^ (t >>> 15);
      this.s[i] = t >>> 0;
    }
  }

  private next(): number {
    const s = this.s;
    const result = Math.imul(s[1] * 5, 1) << 7 | Math.imul(s[1] * 5, 1) >>> 25;
    const finalResult = Math.imul(result, 9);

    const t = s[1] << 9;
    s[2] ^= s[0];
    s[3] ^= s[1];
    s[1] ^= s[2];
    s[0] ^= s[3];
    s[2] ^= t;
    s[3] = (s[3] << 11) | (s[3] >>> 21);

    return finalResult >>> 0;
  }

  getRandomBytes(count: number): Uint8Array {
    const bytes = new Uint8Array(count);
    for (let i = 0; i < count; i++) {
      bytes[i] = this.next() & 0xff;
    }
    return bytes;
  }
}
