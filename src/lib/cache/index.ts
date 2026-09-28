import { memoryCache } from "./memory";
import type { CacheStore } from "./types";

export async function getCache(): Promise<CacheStore> {
  const driver = process.env.CACHE_DRIVER ?? "memory";

  if (driver === "upstash") {
    const { Redis } = await import("@upstash/redis");
    const redis = Redis.fromEnv();
    return {
      get: <T>(key: string) => redis.get<T>(key),
      async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
        await redis.set(key, value, ttlSeconds ? { ex: ttlSeconds } : undefined);
      }
    };
  }

  return memoryCache;
}

export type { CacheStore } from "./types";
