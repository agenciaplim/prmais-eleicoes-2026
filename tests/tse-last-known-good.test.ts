import assert from "node:assert/strict";
import { test } from "node:test";
import { createMemoryCache } from "../src/lib/cache/memory";
import {
  electionResultCacheKey,
  promoteLastKnownGood,
  readLastKnownGood,
  type ElectionResultIdentity
} from "../src/lib/tse/last-known-good";
import { mockResult } from "../src/lib/tse/mock";
import type { ElectionResult } from "../src/lib/tse/types";

const identity: ElectionResultIdentity = {
  scope: "BR",
  scopeType: "country",
  office: "president"
};

function result(overrides: Partial<ElectionResult> = {}): ElectionResult {
  return structuredClone({ ...mockResult, ...overrides });
}

test("promotes and reads a versioned last-known-good snapshot without TTL", async () => {
  const cache = createMemoryCache();
  const storedAt = new Date("2026-09-28T19:00:00.000Z");

  const promotion = await promoteLastKnownGood(cache, result(), () => storedAt);
  const snapshot = await readLastKnownGood(cache, identity);

  assert.equal(promotion.promoted, true);
  assert.equal(snapshot?.version, 1);
  assert.equal(snapshot?.storedAt, storedAt.toISOString());
  assert.deepEqual(snapshot?.data, mockResult);
});

test("never replaces a valid snapshot with invalid data", async () => {
  const cache = createMemoryCache();
  await promoteLastKnownGood(cache, result());
  const invalid = { ...result(), progress: 101 };

  await assert.rejects(() => promoteLastKnownGood(cache, invalid));
  assert.deepEqual((await readLastKnownGood(cache, identity))?.data, mockResult);
});

test("does not replace a newer snapshot with an older totalization", async () => {
  const cache = createMemoryCache();
  const current = result({ sourceId: "2", updatedAt: "2026-09-28T19:00:00-03:00", progress: 60 });
  const stale = result({ sourceId: "3", updatedAt: "2026-09-28T18:59:59-03:00", progress: 59 });
  await promoteLastKnownGood(cache, current);

  const promotion = await promoteLastKnownGood(cache, stale);

  assert.equal(promotion.promoted, false);
  assert.equal(promotion.snapshot.data.sourceId, "2");
  assert.equal(promotion.snapshot.data.progress, 60);
});

test("does not downgrade official data to simulation data", async () => {
  const cache = createMemoryCache();
  const official = result({ sourceId: "10", phase: "official" });
  const simulation = result({ sourceId: "11", phase: "simulation", updatedAt: "2027-01-01T00:00:00-03:00" });
  await promoteLastKnownGood(cache, official);

  const promotion = await promoteLastKnownGood(cache, simulation);

  assert.equal(promotion.promoted, false);
  assert.equal(promotion.snapshot.data.phase, "official");
});

test("ignores a duplicate source snapshot", async () => {
  const cache = createMemoryCache();
  await promoteLastKnownGood(cache, result());

  const promotion = await promoteLastKnownGood(cache, result());
  assert.equal(promotion.promoted, false);
});

test("treats malformed cached data as unavailable without deleting it", async () => {
  const cache = createMemoryCache();
  const key = electionResultCacheKey(identity);
  await cache.set(key, { version: 1, storedAt: "invalid", data: mockResult });

  assert.equal(await readLastKnownGood(cache, identity), null);
  assert.notEqual(await cache.get(key), null);
});

test("reads snapshots stored before party groups existed", async () => {
  const cache = createMemoryCache();
  const { groups: _groups, ...legacy } = result();
  await cache.set(electionResultCacheKey(identity), { version: 1, storedAt: new Date().toISOString(), data: legacy });

  const snapshot = await readLastKnownGood(cache, identity);
  assert.deepEqual(snapshot?.data.groups, []);
});
