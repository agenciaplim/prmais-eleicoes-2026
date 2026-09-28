import type { CacheStore } from "./types";

type Entry = { value: unknown; expiresAt?: number };

export function createMemoryCache(now: () => number = Date.now): CacheStore {
  const store = new Map<string, Entry>();

  return {
    async get<T>(key: string): Promise<T | null> {
      const entry = store.get(key);
      if (!entry) return null;
      if (entry.expiresAt && entry.expiresAt < now()) {
        store.delete(key);
        return null;
      }
      return entry.value as T;
    },
    async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
      store.set(key, {
        value,
        expiresAt: ttlSeconds ? now() + ttlSeconds * 1000 : undefined
      });
    }
  };
}

export const memoryCache = createMemoryCache();
