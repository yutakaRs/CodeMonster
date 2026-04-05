import { describe, it, expect } from "vitest";
import {
  drawNumbers,
  computeRoundId,
  isDrawTime,
  roundIdToDrawTime,
} from "../src/services/draw-engine";
import {
  SeededRandomSource,
  CryptoRandomSource,
} from "../src/services/random-source";

describe("drawNumbers", () => {
  it("draws exactly 20 numbers", () => {
    const source = new SeededRandomSource(42);
    const result = drawNumbers(source);
    expect(result.numbers).toHaveLength(20);
  });

  it("all numbers are in range 1-80", () => {
    const source = new SeededRandomSource(42);
    const result = drawNumbers(source);
    for (const n of result.numbers) {
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(80);
    }
  });

  it("no duplicate numbers", () => {
    const source = new SeededRandomSource(42);
    const result = drawNumbers(source);
    const unique = new Set(result.numbers);
    expect(unique.size).toBe(20);
  });

  it("super number equals the 20th drawn number", () => {
    const source = new SeededRandomSource(42);
    const result = drawNumbers(source);
    expect(result.superNumber).toBe(result.numbers[19]);
  });

  it("same seed produces identical results (deterministic)", () => {
    const source1 = new SeededRandomSource(12345);
    const source2 = new SeededRandomSource(12345);
    const result1 = drawNumbers(source1);
    const result2 = drawNumbers(source2);
    expect(result1.numbers).toEqual(result2.numbers);
    expect(result1.superNumber).toBe(result2.superNumber);
  });

  it("different seeds produce different results", () => {
    const source1 = new SeededRandomSource(111);
    const source2 = new SeededRandomSource(222);
    const result1 = drawNumbers(source1);
    const result2 = drawNumbers(source2);
    // Extremely unlikely to be equal
    expect(result1.numbers).not.toEqual(result2.numbers);
  });

  it("CryptoRandomSource produces valid draws", () => {
    const source = new CryptoRandomSource();
    for (let i = 0; i < 5; i++) {
      const result = drawNumbers(source);
      expect(result.numbers).toHaveLength(20);
      expect(new Set(result.numbers).size).toBe(20);
      expect(result.superNumber).toBe(result.numbers[19]);
      for (const n of result.numbers) {
        expect(n).toBeGreaterThanOrEqual(1);
        expect(n).toBeLessThanOrEqual(80);
      }
    }
  });

  it("multiple draws with same CryptoRandomSource produce different results", () => {
    const source = new CryptoRandomSource();
    const results = Array.from({ length: 5 }, () => drawNumbers(source));
    const allSame = results.every(
      (r) => JSON.stringify(r.numbers) === JSON.stringify(results[0].numbers),
    );
    expect(allSame).toBe(false);
  });
});

describe("computeRoundId", () => {
  it("07:05 is period 001", () => {
    const d = new Date(Date.UTC(2026, 3, 5, 7, 5)); // April 5, 2026, 07:05 Taiwan time (as UTC)
    expect(computeRoundId(d)).toBe("20260405001");
  });

  it("07:10 is period 002", () => {
    const d = new Date(Date.UTC(2026, 3, 5, 7, 10));
    expect(computeRoundId(d)).toBe("20260405002");
  });

  it("23:55 is period 203", () => {
    const d = new Date(Date.UTC(2026, 3, 5, 23, 55));
    expect(computeRoundId(d)).toBe("20260405203");
  });

  it("12:00 is period 060", () => {
    // (12*60+0 - 425) / 5 + 1 = (720-425)/5+1 = 59+1 = 60
    const d = new Date(Date.UTC(2026, 3, 5, 12, 0));
    expect(computeRoundId(d)).toBe("20260405060");
  });
});

describe("isDrawTime", () => {
  it("07:05 is valid", () => {
    const d = new Date(Date.UTC(2026, 3, 5, 7, 5));
    expect(isDrawTime(d)).toBe(true);
  });

  it("23:55 is valid", () => {
    const d = new Date(Date.UTC(2026, 3, 5, 23, 55));
    expect(isDrawTime(d)).toBe(true);
  });

  it("07:00 is NOT valid (before business hours)", () => {
    const d = new Date(Date.UTC(2026, 3, 5, 7, 0));
    expect(isDrawTime(d)).toBe(false);
  });

  it("00:00 is NOT valid (before business hours)", () => {
    const d = new Date(Date.UTC(2026, 3, 5, 0, 0));
    expect(isDrawTime(d)).toBe(false);
  });

  it("07:07 is NOT valid (not on 5-min boundary)", () => {
    const d = new Date(Date.UTC(2026, 3, 5, 7, 7));
    expect(isDrawTime(d)).toBe(false);
  });

  it("12:30 is valid", () => {
    const d = new Date(Date.UTC(2026, 3, 5, 12, 30));
    expect(isDrawTime(d)).toBe(true);
  });
});

describe("roundIdToDrawTime", () => {
  it("converts round 20260405001 to correct UTC time", () => {
    const iso = roundIdToDrawTime("20260405001");
    // Taiwan 07:05 = UTC 23:05 previous day (April 4)
    expect(iso).toBe("2026-04-04T23:05:00.000Z");
  });

  it("converts round 20260405203 to correct UTC time", () => {
    const iso = roundIdToDrawTime("20260405203");
    // Taiwan 23:55 = UTC 15:55 same day
    expect(iso).toBe("2026-04-05T15:55:00.000Z");
  });
});
