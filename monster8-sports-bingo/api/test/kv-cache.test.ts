import { describe, it, expect } from "vitest";
import { KvCache } from "../src/services/kv-cache";

describe("KvCache.buildKey", () => {
  it("returns prefix only when no params", () => {
    expect(KvCache.buildKey("sports_api:leagues")).toBe("sports_api:leagues");
  });

  it("returns prefix only when params is empty object", () => {
    expect(KvCache.buildKey("sports_api:leagues", {})).toBe(
      "sports_api:leagues",
    );
  });

  it("same params in different order produce the same key", () => {
    const key1 = KvCache.buildKey("sports_api:events", {
      sport: "basketball",
      league: "nba",
    });
    const key2 = KvCache.buildKey("sports_api:events", {
      league: "nba",
      sport: "basketball",
    });
    expect(key1).toBe(key2);
  });

  it("different params produce different keys", () => {
    const key1 = KvCache.buildKey("sports_api:events", { sport: "basketball" });
    const key2 = KvCache.buildKey("sports_api:events", { sport: "baseball" });
    expect(key1).not.toBe(key2);
  });

  it("key format is prefix:hex", () => {
    const key = KvCache.buildKey("test", { a: "1" });
    expect(key).toMatch(/^test:[0-9a-f]{8}$/);
  });
});

describe("KvCache.get", () => {
  /**
   * Create a minimal in-memory KV mock that supports get/put with JSON.
   */
  function createMockKv() {
    const store = new Map<string, string>();
    return {
      get: async (key: string, type?: string) => {
        const val = store.get(key);
        if (!val) return null;
        return type === "json" ? JSON.parse(val) : val;
      },
      put: async (key: string, value: string) => {
        store.set(key, value);
      },
    } as unknown as KVNamespace;
  }

  it("returns MISS on first call, HIT on second", async () => {
    const kv = createMockKv();
    const cache = new KvCache(kv);

    let fetchCount = 0;
    const fetcher = async () => {
      fetchCount++;
      return { leagues: ["nba", "mlb"] };
    };

    const first = await cache.get("test-key", 60, fetcher);
    expect(first.cacheStatus).toBe("MISS");
    expect(first.data).toEqual({ leagues: ["nba", "mlb"] });
    expect(fetchCount).toBe(1);

    const second = await cache.get("test-key", 60, fetcher);
    expect(second.cacheStatus).toBe("HIT");
    expect(second.data).toEqual({ leagues: ["nba", "mlb"] });
    expect(fetchCount).toBe(1); // fetcher not called again
  });

  it("includes cachedAt on HIT but not on MISS", async () => {
    const kv = createMockKv();
    const cache = new KvCache(kv);

    const miss = await cache.get("key2", 60, async () => "data");
    expect(miss.cachedAt).toBeUndefined();

    const hit = await cache.get("key2", 60, async () => "data");
    expect(hit.cachedAt).toBeDefined();
    expect(typeof hit.cachedAt).toBe("string");
  });
});
