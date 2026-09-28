import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { createMemoryCache } from "../src/lib/cache";
import {
  normalizeEa12Catalog,
  promoteLocationCatalog,
  readLocationCatalog,
  type LocationCatalog
} from "../src/lib/tse/location-catalog";
import { parseTseJson } from "../src/lib/tse/parser";
import { parsePublicLocationQuery, publicLocationPayload } from "../src/lib/tse/public-locations";

async function fixtureCatalog(): Promise<LocationCatalog> {
  const url = new URL("./fixtures/tse/ea12-pr-municipalities.json", import.meta.url);
  const payload = parseTseJson("EA12", await readFile(fileURLToPath(url), "utf8"));
  return normalizeEa12Catalog(payload, "21272");
}

test("normalizes EA12 states and municipalities into the public catalog model", async () => {
  const catalog = await fixtureCatalog();

  assert.equal(catalog.sourceId, "1002");
  assert.equal(catalog.electionId, "21272");
  assert.equal(catalog.phase, "simulation");
  assert.equal(catalog.generatedAt, "2026-09-28T15:00:00-03:00");
  assert.deepEqual(catalog.states[0], {
    code: "PR",
    name: "PARANÁ",
    municipalities: [
      { tseCode: "74012", ibgeCode: "4100103", name: "ABATIÁ", capital: false, zones: ["0082"] },
      {
        tseCode: "75353",
        ibgeCode: "4106902",
        name: "CURITIBA",
        capital: true,
        zones: ["0001", "0002"]
      },
      {
        tseCode: "76678",
        ibgeCode: "4113700",
        name: "LONDRINA",
        capital: false,
        zones: ["0041", "0042"]
      }
    ]
  });
});

test("promotes a versioned location catalog without TTL and ignores duplicates", async () => {
  const cache = createMemoryCache();
  const catalog = await fixtureCatalog();
  const storedAt = new Date("2026-09-28T19:00:00.000Z");

  const first = await promoteLocationCatalog(cache, catalog, () => storedAt);
  const duplicate = await promoteLocationCatalog(cache, catalog);
  const snapshot = await readLocationCatalog(cache);

  assert.equal(first.promoted, true);
  assert.equal(duplicate.promoted, false);
  assert.equal(snapshot?.version, 1);
  assert.equal(snapshot?.storedAt, storedAt.toISOString());
  assert.deepEqual(snapshot?.data, catalog);
});

test("does not replace an official catalog with a newer simulation", async () => {
  const cache = createMemoryCache();
  const catalog = await fixtureCatalog();
  await promoteLocationCatalog(cache, { ...catalog, phase: "official" });

  const promotion = await promoteLocationCatalog(cache, {
    ...catalog,
    sourceId: "1003",
    generatedAt: "2027-01-01T00:00:00-03:00"
  });

  assert.equal(promotion.promoted, false);
  assert.equal(promotion.snapshot.data.phase, "official");
});

test("parses state catalog queries defensively", () => {
  assert.deepEqual(parsePublicLocationQuery(new URLSearchParams()), { success: true, state: null });
  assert.deepEqual(parsePublicLocationQuery(new URLSearchParams("state=pr")), { success: true, state: "PR" });
  assert.deepEqual(parsePublicLocationQuery(new URLSearchParams("state=PR")), {
    success: false,
    code: "INVALID_STATE"
  });
  assert.deepEqual(parsePublicLocationQuery(new URLSearchParams("state=pr&state=sp")), {
    success: false,
    code: "DUPLICATE_PARAMETER"
  });
  assert.deepEqual(parsePublicLocationQuery(new URLSearchParams("url=https://example.com")), {
    success: false,
    code: "UNKNOWN_PARAMETER"
  });
});

test("publishes a lightweight state index and one full state at a time", async () => {
  const catalog = await fixtureCatalog();
  const index = publicLocationPayload(catalog, null);
  const state = publicLocationPayload(catalog, "PR");

  assert.deepEqual(index, {
    sourceId: "1002",
    electionId: "21272",
    phase: "simulation",
    generatedAt: "2026-09-28T15:00:00-03:00",
    states: [{ code: "PR", name: "PARANÁ", municipalityCount: 3 }]
  });
  assert.equal(state && "state" in state ? state.state.municipalities.length : 0, 3);
  assert.equal(publicLocationPayload(catalog, "SP"), null);
});
