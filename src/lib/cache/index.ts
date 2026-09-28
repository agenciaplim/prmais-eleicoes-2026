import { memoryCache } from "./memory";

export async function getCache() {
  const driver = process.env.CACHE_DRIVER ?? "memory";

  if (driver === "upstash") {
    const { Redis } = await import("@upstash/redis");
    const redis = Redis.fromEnv();
    return {
      get: <T>(key: string) => redis.get<T>(key),
      set: (key: string, value: unknown, ttlSeconds?: number) =>
        redis.set(key, value, ttlSeconds ? { ex: ttlSeconds } : undefined)
    };
  }

  return memoryCache;
}
