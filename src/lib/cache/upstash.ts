import type { CacheStore } from "./types";
import { validateTtl } from "./ttl";

export type UpstashRedisClient = {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, options?: { ex: number }): Promise<unknown>;
};

export function createUpstashCache(redis: UpstashRedisClient): CacheStore {
  return {
    get: <T>(key: string) => redis.get<T>(key),
    async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
      validateTtl(ttlSeconds);
      await redis.set(key, value, ttlSeconds === undefined ? undefined : { ex: ttlSeconds });
    }
  };
}
