import assert from "node:assert/strict";
import { test } from "node:test";
import { CacheConfigError, cacheConfigFromEnv, createUpstashCache } from "../src/lib/cache";

test("uses memory cache by default outside production", () => {
  assert.deepEqual(cacheConfigFromEnv({}, "development"), { driver: "memory" });
});

test("requires an explicit persistent cache in production", () => {
  assert.throws(() => cacheConfigFromEnv({}, "production"), CacheConfigError);
  assert.throws(
    () => cacheConfigFromEnv({ CACHE_DRIVER: "memory" }, "production"),
    (error: unknown) => error instanceof CacheConfigError && !error.message.includes("undefined")
  );
});

test("validates Upstash credentials and endpoint without exposing the token", () => {
  const token = "secret-token-marker";

  assert.throws(
    () =>
      cacheConfigFromEnv(
        {
          CACHE_DRIVER: "upstash",
          UPSTASH_REDIS_REST_URL: "https://example.com",
          UPSTASH_REDIS_REST_TOKEN: token
        },
        "production"
      ),
    (error: unknown) => error instanceof CacheConfigError && !error.message.includes(token)
  );

  assert.deepEqual(
    cacheConfigFromEnv(
      {
        CACHE_DRIVER: "upstash",
        UPSTASH_REDIS_REST_URL: "https://prmais-eleicoes.upstash.io/",
        UPSTASH_REDIS_REST_TOKEN: token
      },
      "production"
    ),
    { driver: "upstash", url: "https://prmais-eleicoes.upstash.io", token }
  );
});

test("maps CacheStore operations to the Upstash REST client", async () => {
  const calls: unknown[][] = [];
  const values = new Map<string, unknown>();
  const cache = createUpstashCache({
    async get<T>(key: string): Promise<T | null> {
      return (values.get(key) as T | undefined) ?? null;
    },
    async set(key: string, value: unknown, options?: { ex: number }): Promise<unknown> {
      calls.push([key, value, options]);
      values.set(key, value);
      return "OK";
    }
  });

  await cache.set("persistent", { ok: true });
  await cache.set("temporary", "value", 60);

  assert.deepEqual(await cache.get("persistent"), { ok: true });
  assert.deepEqual(calls, [
    ["persistent", { ok: true }, undefined],
    ["temporary", "value", { ex: 60 }]
  ]);
});
