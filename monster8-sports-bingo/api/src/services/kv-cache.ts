export interface CacheResult<T> {
  data: T;
  cacheStatus: "HIT" | "MISS";
  cachedAt?: string;
  ttl: number;
}

interface CacheEntry {
  data: unknown;
  cachedAt: string;
}

export class KvCache {
  constructor(private kv: KVNamespace) {}

  async get<T>(key: string, ttl: number, fetcher: () => Promise<T>): Promise<CacheResult<T>> {
    // Try cache first
    const cached = await this.kv.get<CacheEntry>(key, "json");
    if (cached) {
      return {
        data: cached.data as T,
        cacheStatus: "HIT",
        cachedAt: cached.cachedAt,
        ttl,
      };
    }

    // Cache miss — fetch from source
    const data = await fetcher();
    const entry: CacheEntry = {
      data,
      cachedAt: new Date().toISOString(),
    };

    // Write to KV with TTL (non-blocking)
    await this.kv.put(key, JSON.stringify(entry), { expirationTtl: ttl });

    return { data, cacheStatus: "MISS", ttl };
  }

  /**
   * Build a deterministic cache key from endpoint + sorted params.
   * Uses a simple hash to keep keys short.
   */
  static buildKey(prefix: string, params?: Record<string, string>): string {
    if (!params || Object.keys(params).length === 0) return prefix;

    const sorted = Object.keys(params)
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join("&");

    // 為什麼用 djb2 而不是 SHA-256：
    // 1. SHA-256 需要 async（crypto.subtle.digest），會讓 buildKey 變成 async，
    //    連帶所有呼叫處都要加 await，增加不必要的複雜度
    // 2. cache key 不需要密碼學安全性，只需要「不同參數產生不同 key」
    // 3. djb2 碰撞率在 cache key 場景可接受（最壞情況只是共用快取，不是安全問題）
    // 4. djb2 是同步、快速、確定性的 hash，適合這個用途
    let hash = 5381;
    for (let i = 0; i < sorted.length; i++) {
      hash = ((hash << 5) + hash + sorted.charCodeAt(i)) & 0xffffffff;
    }
    const hex = (hash >>> 0).toString(16).padStart(8, "0");

    return `${prefix}:${hex}`;
  }
}
