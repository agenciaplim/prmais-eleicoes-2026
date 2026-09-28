import type { CacheStore } from "./types";
import { validateTtl } from "./ttl";

type Entry = { value: unknown; expiresAt?: number };

export function createMemoryCache(now: () => number = Date.now): CacheStore {
  const store = new Map<string, Entry>();

  return {
    async get<T>(key: string): Promise<T | null> {
      const entry = store.get(key);
      if (!entry) return null;
      if (entry.expiresAt !== undefined && entry.expiresAt <= now()) {
        store.delete(key);
        return null;
      }
      return structuredClone(entry.value) as T;
    },
    async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
      validateTtl(ttlSeconds);
      store.set(key, {
        value: structuredClone(value),
        expiresAt: ttlSeconds === undefined ? undefined : now() + ttlSeconds * 1000
      });
    }
  };
}

export const memoryCache = createMemoryCache();
