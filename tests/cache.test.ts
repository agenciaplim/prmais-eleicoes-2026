import assert from "node:assert/strict";
import { test } from "node:test";
import { CacheConfigError, cacheConfigFromEnv, createMemoryCache, createUpstashCache } from "../src/lib/cache";
import {
  CollectorAuthConfigError,
  collectorSecretFromEnv,
  isCollectorAuthorized
} from "../src/lib/security/collector-auth";

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

test("keeps memory cache instances isolated", async () => {
  const first = createMemoryCache();
  const second = createMemoryCache();
  await first.set("key", "first");

  assert.equal(await first.get("key"), "first");
  assert.equal(await second.get("key"), null);
});

test("expires memory entries exactly at their TTL", async () => {
  let now = 1_000;
  const cache = createMemoryCache(() => now);
  await cache.set("key", "value", 2);

  now = 2_999;
  assert.equal(await cache.get("key"), "value");
  now = 3_000;
  assert.equal(await cache.get("key"), null);
});

test("copies values across the memory cache boundary", async () => {
  const cache = createMemoryCache();
  const original = { nested: { value: 1 } };
  await cache.set("key", original);
  original.nested.value = 2;

  const firstRead = await cache.get<typeof original>("key");
  assert.equal(firstRead?.nested.value, 1);
  firstRead!.nested.value = 3;
  assert.equal((await cache.get<typeof original>("key"))?.nested.value, 1);
});

test("rejects invalid TTLs consistently", async () => {
  const memory = createMemoryCache();
  const upstash = createUpstashCache({
    async get() {
      return null;
    },
    async set() {
      return "OK";
    }
  });

  await assert.rejects(() => memory.set("key", "value", 0), RangeError);
  await assert.rejects(() => upstash.set("key", "value", 1.5), RangeError);
});

test("requires a strong collector secret and compares bearer tokens safely", () => {
  assert.throws(() => collectorSecretFromEnv({ COLLECTOR_SECRET: "short" }), CollectorAuthConfigError);

  const secret = "a-secure-local-collector-secret-123456";
  assert.equal(collectorSecretFromEnv({ COLLECTOR_SECRET: secret }), secret);
  assert.equal(isCollectorAuthorized(`Bearer ${secret}`, secret), true);
  assert.equal(isCollectorAuthorized("Bearer incorrect", secret), false);
  assert.equal(isCollectorAuthorized(null, secret), false);
});
