import assert from "node:assert/strict";
import { test } from "node:test";
import { createMemoryCache } from "../src/lib/cache/memory";
import { mockResult } from "../src/lib/tse/mock";
import type { ElectionResult } from "../src/lib/tse/types";
import { appendUpdates, deriveUpdates, readUpdates } from "../src/lib/tse/updates";

const result = (overrides: Partial<ElectionResult>): ElectionResult => ({
  ...structuredClone(mockResult),
  phase: "official",
  updatedAt: "2026-10-04T18:43:00-03:00",
  ...overrides
});

test("announces progress milestones, first leader and leader changes", () => {
  const first = deriveUpdates(null, result({ progress: 58.42 }));
  assert.deepEqual(first.map((e) => e.text), [
    "50% das seções apuradas em todo o país.",
    "Candidato A (XX) sai na frente para Presidente em todo o país."
  ]);

  const swapped = [...mockResult.candidates].reverse();
  const change = deriveUpdates(result({ progress: 58.42 }), result({ progress: 61, candidates: swapped, sourceId: "9" }));
  assert.deepEqual(change.map((e) => e.text), [
    "60% das seções apuradas em todo o país.",
    `${swapped[0]!.name} (${swapped[0]!.party}) assume a liderança para Presidente em todo o país.`
  ]);
});

test("uses the governor for Paraná progress and announces the final result", () => {
  const governor = result({ office: "governor", scope: "PR", scopeType: "state", progress: 30 });
  assert.deepEqual(deriveUpdates(null, governor).map((e) => e.text), [
    "Paraná ultrapassa 25% das seções apuradas.",
    "Candidato A (XX) sai na frente para Governador no Paraná."
  ]);

  const candidates = structuredClone(mockResult.candidates);
  candidates[0]!.elected = true;
  const final = deriveUpdates(governor, { ...governor, progress: 100, final: true, candidates });
  assert.equal(final.at(-1)?.text, "Candidato A eleito(a) para Governador.");
});

test("stores events once, newest first", async () => {
  const cache = createMemoryCache();
  const events = deriveUpdates(null, result({ progress: 58.42 }));
  assert.equal(await appendUpdates(cache, events), 2);
  assert.equal(await appendUpdates(cache, events), 0);
  const later = [{ id: "x", at: "2026-10-04T19:00:00-03:00", text: "Nova." }];
  await appendUpdates(cache, later);
  assert.equal((await readUpdates(cache))[0]?.text, "Nova.");
});

test("resets comparisons when the phase changes", () => {
  const simulation = result({ phase: "simulation", progress: 100 });
  assert.equal(deriveUpdates(simulation, result({ progress: 12 }))[0]?.text, "10% das seções apuradas em todo o país.");
});
