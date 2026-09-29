import assert from "node:assert/strict";
import { test } from "node:test";
import { loadHomeResults } from "../src/lib/tse/home-results";
import { mockResult } from "../src/lib/tse/mock";
import { formatPercent, formatVotes } from "../src/lib/ui/format";

test("loads each home result independently", async () => {
  const results = await loadHomeResults(async (identity, isDefault) => {
    if (identity.office === "governor") throw new Error("cache down");
    return isDefault ? { source: "mock", data: mockResult } : { source: "unavailable" };
  });

  assert.equal(results.governor.source, "unavailable");
  assert.equal(results.presidentBr.source, "mock");
  assert.equal(results.senator.source, "unavailable");
  assert.equal(Object.keys(results).length, 6);
});

test("formats percentages and votes in pt-BR", () => {
  assert.equal(formatPercent(42.1), "42,10%");
  assert.equal(formatVotes(32548921), "32.548.921 votos");
  assert.equal(formatVotes(1), "1 voto");
});
