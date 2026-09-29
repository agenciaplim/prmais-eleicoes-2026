import assert from "node:assert/strict";
import { test } from "node:test";
import { createMemoryCache } from "../src/lib/cache/memory";
import { promoteLastKnownGood, type ElectionResultIdentity } from "../src/lib/tse/last-known-good";
import { mockResult } from "../src/lib/tse/mock";
import { loadPublicResult } from "../src/lib/tse/public-result-loader";
import { buildHeroStatus, type HeroResult } from "../src/lib/ui/hero-status";

const identity: ElectionResultIdentity = { scope: "BR", scopeType: "country", office: "president" };
const now = new Date("2026-10-04T21:50:00-03:00");

function hero(overrides: Partial<HeroResult> = {}): HeroResult {
  return { status: "in-progress", phase: "official", final: false, progress: 58.42, updatedAt: "2026-10-04T18:43:00-03:00", ...overrides };
}

test("shows live status with Brasília time and pt-BR progress", () => {
  assert.deepEqual(buildHeroStatus("cache", hero(), now), {
    state: "live",
    badge: "Apuração ao vivo",
    updatedText: "Atualizado às 18:43",
    progressText: "58,42% das seções apuradas",
    note: null
  });
});

test("includes the date when the update is from another day", () => {
  const status = buildHeroStatus("cache", hero({ updatedAt: "2026-10-03T23:59:00-03:00" }), now);
  assert.equal(status.updatedText, "Atualizado em 03/10 às 23:59");
});

test("marks finished and not-started elections", () => {
  assert.equal(buildHeroStatus("cache", hero({ final: true, progress: 100 }), now).badge, "Apuração encerrada");
  const waiting = buildHeroStatus("cache", hero({ status: "not-started", progress: 0 }), now);
  assert.equal(waiting.badge, "Aguardando início");
  assert.equal(waiting.progressText, null);
});

test("flags simulation data and demo data", () => {
  assert.equal(buildHeroStatus("cache", hero({ phase: "simulation" }), now).note, "Dados do ambiente de simulação do TSE.");
  const demo = buildHeroStatus("mock", hero(), now);
  assert.equal(demo.updatedText, null);
  assert.match(demo.note ?? "", /demonstrativos/);
});

test("shows a waiting state when results are unavailable", () => {
  const status = buildHeroStatus("unavailable", null, now);
  assert.equal(status.state, "unavailable");
  assert.equal(status.progressText, null);
});

test("loader serves cached snapshots before the mock", async () => {
  const cache = createMemoryCache();
  assert.equal((await loadPublicResult(identity, true, { cache, production: false })).source, "mock");
  await promoteLastKnownGood(cache, structuredClone(mockResult));
  const loaded = await loadPublicResult(identity, true, { cache, production: false });
  assert.equal(loaded.source, "cache");
});

test("loader never falls back to the mock in production or for other identities", async () => {
  const cache = createMemoryCache();
  assert.equal((await loadPublicResult(identity, true, { cache, production: true })).source, "unavailable");
  const governor: ElectionResultIdentity = { scope: "PR", scopeType: "state", office: "governor" };
  assert.equal((await loadPublicResult(governor, false, { cache, production: false })).source, "unavailable");
});
