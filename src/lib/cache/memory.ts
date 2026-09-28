type Entry = { value: unknown; expiresAt?: number };
const store = new Map<string, Entry>();

export const memoryCache = {
  async get<T>(key: string): Promise<T | null> {
    const entry = store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      store.delete(key);
      return null;
    }
    return entry.value as T;
  },
  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    store.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined
    });
  }
};
