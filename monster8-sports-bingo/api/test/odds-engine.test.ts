import { describe, it, expect } from "vitest";
import {
  judgeStar,
  judgeBigSmall,
  judgeOddEven,
  judgeSuper,
  STAR_PAYOUTS,
  BET_AMOUNT_CENTS,
} from "../src/services/odds-engine";

// Helper: generate 20 numbers from 1-80
const drawn20 = [3, 7, 12, 15, 22, 28, 33, 37, 41, 45, 50, 55, 60, 62, 68, 70, 73, 75, 78, 80];

describe("judgeStar", () => {
  describe("1 star", () => {
    it("中 1 = 2x", () => {
      const r = judgeStar([3], drawn20, 1);
      expect(r.won).toBe(true);
      expect(r.matchedCount).toBe(1);
      expect(r.multiplier).toBe(2);
      expect(r.payoutPerUnit).toBe(BET_AMOUNT_CENTS * 2);
    });

    it("中 0 = no win", () => {
      const r = judgeStar([99], drawn20, 1); // 99 doesn't exist in range but test logic
      expect(r.won).toBe(false);
      expect(r.multiplier).toBe(0);
    });
  });

  describe("2 star", () => {
    it("中 2 = 3x", () => {
      const r = judgeStar([3, 7], drawn20, 2);
      expect(r.multiplier).toBe(3);
    });
    it("中 1 = 1x", () => {
      const r = judgeStar([3, 99], drawn20, 2);
      expect(r.multiplier).toBe(1);
    });
    it("中 0 = no win", () => {
      const r = judgeStar([1, 2], drawn20, 2);
      expect(r.won).toBe(false);
    });
  });

  describe("3 star", () => {
    it("中 3 = 20x", () => {
      const r = judgeStar([3, 7, 12], drawn20, 3);
      expect(r.multiplier).toBe(20);
    });
    it("中 2 = 2x", () => {
      const r = judgeStar([3, 7, 99], drawn20, 3);
      expect(r.multiplier).toBe(2);
    });
    it("中 1 = no win", () => {
      const r = judgeStar([3, 1, 2], drawn20, 3);
      expect(r.won).toBe(false);
    });
  });

  describe("5 star", () => {
    it("中 5 = 300x", () => {
      const r = judgeStar([3, 7, 12, 15, 22], drawn20, 5);
      expect(r.multiplier).toBe(300);
    });
    it("中 4 = 20x", () => {
      const r = judgeStar([3, 7, 12, 15, 99], drawn20, 5);
      expect(r.multiplier).toBe(20);
    });
    it("中 3 = 2x", () => {
      const r = judgeStar([3, 7, 12, 1, 2], drawn20, 5);
      expect(r.multiplier).toBe(2);
    });
    it("中 2 = no win", () => {
      const r = judgeStar([3, 7, 1, 2, 4], drawn20, 5);
      expect(r.won).toBe(false);
    });
  });

  describe("8 star — special: 中 0 = 1x", () => {
    it("中 8 = 20000x", () => {
      const r = judgeStar([3, 7, 12, 15, 22, 28, 33, 37], drawn20, 8);
      expect(r.multiplier).toBe(20000);
    });
    it("中 0 = 1x (special rule)", () => {
      const r = judgeStar([1, 2, 4, 5, 6, 8, 9, 10], drawn20, 8);
      expect(r.matchedCount).toBe(0);
      expect(r.won).toBe(true);
      expect(r.multiplier).toBe(1);
    });
    it("中 1 = no win (between 0 and 4)", () => {
      const r = judgeStar([3, 1, 2, 4, 5, 6, 8, 9], drawn20, 8);
      expect(r.matchedCount).toBe(1);
      expect(r.won).toBe(false);
    });
  });

  describe("9 star — special: 中 0 = 1x", () => {
    it("中 9 = 40000x", () => {
      const r = judgeStar([3, 7, 12, 15, 22, 28, 33, 37, 41], drawn20, 9);
      expect(r.multiplier).toBe(40000);
    });
    it("中 0 = 1x (special rule)", () => {
      const r = judgeStar([1, 2, 4, 5, 6, 8, 9, 10, 11], drawn20, 9);
      expect(r.won).toBe(true);
      expect(r.multiplier).toBe(1);
    });
  });

  describe("10 star — special: 中 0 = 1x", () => {
    it("中 10 = 200000x", () => {
      const r = judgeStar([3, 7, 12, 15, 22, 28, 33, 37, 41, 45], drawn20, 10);
      expect(r.multiplier).toBe(200000);
    });
    it("中 0 = 1x (special rule)", () => {
      const r = judgeStar([1, 2, 4, 5, 6, 8, 9, 10, 11, 13], drawn20, 10);
      expect(r.won).toBe(true);
      expect(r.multiplier).toBe(1);
    });
    it("中 5 = 1x", () => {
      const r = judgeStar([3, 7, 12, 15, 22, 1, 2, 4, 5, 6], drawn20, 10);
      expect(r.multiplier).toBe(1);
    });
  });

  it("validates all payout table entries", () => {
    for (const [stars, payouts] of Object.entries(STAR_PAYOUTS)) {
      for (const [matched, mult] of Object.entries(payouts)) {
        expect(mult).toBeGreaterThan(0);
        expect(Number(matched)).toBeGreaterThanOrEqual(0);
        expect(Number(matched)).toBeLessThanOrEqual(Number(stars));
      }
    }
  });
});

describe("judgeBigSmall", () => {
  it("13 big numbers → big wins", () => {
    // 13 numbers from 41-80, 7 from 1-40
    const drawn = [1, 2, 3, 4, 5, 6, 7, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53];
    const r = judgeBigSmall(drawn, "big");
    expect(r.won).toBe(true);
    expect(r.multiplier).toBe(6);
    expect(r.payoutPerUnit).toBe(BET_AMOUNT_CENTS * 6);
  });

  it("13 small numbers → small wins", () => {
    const drawn = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 41, 42, 43, 44, 45, 46, 47];
    const r = judgeBigSmall(drawn, "small");
    expect(r.won).toBe(true);
    expect(r.multiplier).toBe(6);
  });

  it("10/10 split → nobody wins", () => {
    const drawn = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50];
    expect(judgeBigSmall(drawn, "big").won).toBe(false);
    expect(judgeBigSmall(drawn, "small").won).toBe(false);
  });

  it("12/8 split → nobody wins (need >= 13)", () => {
    const drawn = [1, 2, 3, 4, 5, 6, 7, 8, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52];
    expect(judgeBigSmall(drawn, "big").won).toBe(false);
    expect(judgeBigSmall(drawn, "small").won).toBe(false);
  });

  it("selected big but small wins → no win", () => {
    const drawn = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 41, 42, 43, 44, 45, 46, 47];
    expect(judgeBigSmall(drawn, "big").won).toBe(false);
  });

  it("all 20 from big side → big wins (20 >= 13)", () => {
    const drawn = Array.from({ length: 20 }, (_, i) => 41 + i);
    expect(judgeBigSmall(drawn, "big").won).toBe(true);
    expect(judgeBigSmall(drawn, "small").won).toBe(false);
  });
});

describe("judgeOddEven", () => {
  it("13 odd numbers → odd wins", () => {
    // 13 odd + 7 even
    const drawn = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 2, 4, 6, 8, 10, 12, 14];
    const r = judgeOddEven(drawn, "odd");
    expect(r.won).toBe(true);
    expect(r.multiplier).toBe(6);
  });

  it("13 even numbers → even wins", () => {
    const drawn = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 1, 3, 5, 7, 9, 11, 13];
    const r = judgeOddEven(drawn, "even");
    expect(r.won).toBe(true);
    expect(r.multiplier).toBe(6);
  });

  it("10/10 split → nobody wins", () => {
    const drawn = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20];
    expect(judgeOddEven(drawn, "odd").won).toBe(false);
    expect(judgeOddEven(drawn, "even").won).toBe(false);
  });

  it("12 odd / 8 even → nobody wins", () => {
    const drawn = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 2, 4, 6, 8, 10, 12, 14, 16];
    expect(judgeOddEven(drawn, "odd").won).toBe(false);
    expect(judgeOddEven(drawn, "even").won).toBe(false);
  });
});

describe("judgeSuper", () => {
  it("selected number matches super number → win 48x", () => {
    const r = judgeSuper([80], 80); // super is the 20th drawn
    expect(r.won).toBe(true);
    expect(r.multiplier).toBe(48);
    expect(r.payoutPerUnit).toBe(BET_AMOUNT_CENTS * 48);
  });

  it("selected number does not match → no win", () => {
    const r = judgeSuper([1], 80);
    expect(r.won).toBe(false);
    expect(r.multiplier).toBe(0);
  });

  it("multi-select: one match among many", () => {
    const r = judgeSuper([1, 2, 3, 80], 80);
    expect(r.won).toBe(true);
    expect(r.matchedCount).toBe(1);
  });

  it("multi-select: no match", () => {
    const r = judgeSuper([1, 2, 3, 4, 5], 80);
    expect(r.won).toBe(false);
  });
});
