import assert from "node:assert/strict";
import { test } from "node:test";

// Production without a configured cache: public routes must fail closed with 503, not 500.
test("public routes answer 503 when the cache is not configured", async () => {
  const env = process.env as Record<string, string | undefined>;
  const previous = { NODE_ENV: env.NODE_ENV, CACHE_DRIVER: env.CACHE_DRIVER };
  env.NODE_ENV = "production";
  delete env.CACHE_DRIVER;
  const originalError = console.error;
  console.error = () => {};
  try {
    const results = await import("../src/app/api/results/route");
    const locations = await import("../src/app/api/locations/route");
    const municipalities = await import("../src/app/api/municipalities/route");
    const photos = await import("../src/app/api/photos/[id]/route");

    for (const response of [
      await results.GET(new Request("http://x/api/results")),
      await locations.GET(new Request("http://x/api/locations")),
      await municipalities.GET(new Request("http://x/api/municipalities?office=president")),
      await photos.GET(new Request("http://x/api/photos/10000000001"), { params: Promise.resolve({ id: "10000000001" }) })
    ]) {
      assert.equal(response.status, 503);
      assert.equal(response.headers.get("cache-control"), "no-store");
    }
  } finally {
    console.error = originalError;
    Object.assign(env, previous);
  }
});
