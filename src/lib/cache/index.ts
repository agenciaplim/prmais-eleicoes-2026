import { cacheConfigFromEnv } from "./config";
import { memoryCache } from "./memory";
import type { CacheStore } from "./types";
import { createUpstashCache } from "./upstash";

export async function getCache(): Promise<CacheStore> {
  const config = cacheConfigFromEnv();

  if (config.driver === "upstash") {
    const { Redis } = await import("@upstash/redis");
    return createUpstashCache(new Redis({ url: config.url, token: config.token }));
  }

  return memoryCache;
}

export { CacheConfigError, cacheConfigFromEnv } from "./config";
export { createMemoryCache } from "./memory";
export { createUpstashCache } from "./upstash";
export type { CacheStore } from "./types";
