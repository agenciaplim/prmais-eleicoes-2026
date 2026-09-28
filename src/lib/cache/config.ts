export type CacheConfig = { driver: "memory" } | { driver: "upstash"; url: string; token: string };
type Environment = Readonly<Record<string, string | undefined>>;

export class CacheConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CacheConfigError";
  }
}

function validateUpstashUrl(rawUrl: string): string {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new CacheConfigError("UPSTASH_REDIS_REST_URL is invalid");
  }

  if (
    url.protocol !== "https:" ||
    !url.hostname.endsWith(".upstash.io") ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new CacheConfigError("UPSTASH_REDIS_REST_URL must be an HTTPS Upstash endpoint");
  }

  return url.href.replace(/\/$/, "");
}

export function cacheConfigFromEnv(
  env: Environment = process.env,
  nodeEnv: string | undefined = process.env.NODE_ENV
): CacheConfig {
  const driver = env.CACHE_DRIVER ?? (nodeEnv === "production" ? undefined : "memory");

  if (!driver) {
    throw new CacheConfigError("CACHE_DRIVER is required in production");
  }

  if (driver === "memory") {
    if (nodeEnv === "production") {
      throw new CacheConfigError("CACHE_DRIVER=memory is not allowed in production");
    }
    return { driver: "memory" };
  }

  if (driver !== "upstash") {
    throw new CacheConfigError("CACHE_DRIVER must be memory or upstash");
  }

  const rawUrl = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;
  if (!rawUrl || !token) {
    throw new CacheConfigError("Upstash URL and token are required when CACHE_DRIVER=upstash");
  }

  return { driver: "upstash", url: validateUpstashUrl(rawUrl), token };
}
