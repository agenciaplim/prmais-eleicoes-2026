import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { createMemoryCache } from "../src/lib/cache/memory";
import type { TseClient, TseFileRequest } from "../src/lib/tse/client";
import { collectMunicipalResults, readMunicipalSummary, type MunicipalityRef } from "../src/lib/tse/municipal-results";
import { parseTseJson } from "../src/lib/tse/parser";
import type { Ea20Payload } from "../src/lib/tse/schemas";

const municipalities: MunicipalityRef[] = [
  { tseCode: "75353", ibgeCode: "4106902", name: "CURITIBA" },
  { tseCode: "74012", ibgeCode: "4100103", name: "ABATIÁ" },
  { tseCode: "76678", ibgeCode: "4113700", name: "LONDRINA" }
];

async function curitiba(): Promise<Ea20Payload> {
  const url = new URL("./fixtures/tse/ea20-president-curitiba.json", import.meta.url);
  return parseTseJson("EA20", await readFile(fileURLToPath(url), "utf8"));
}

function client(base: Ea20Payload, options: { fail?: Set<string>; time?: (code: string) => string; requests?: string[] } = {}): TseClient {
  return {
    buildUrl() {
      throw new Error("unused");
    },
    async fetchPayload(request: TseFileRequest) {
      if (request.kind !== "EA20" || request.scope.type !== "municipality") throw new Error("unexpected request");
      const code = request.scope.municipalityCode;
      options.requests?.push(code);
      if (options.fail?.has(code)) throw new Error("network");
      const payload = structuredClone(base);
      payload.cdabr = code;
      if (options.time) payload.ht = options.time(code);
      return payload;
    }
  } as TseClient;
}

const base = { office: "president", officeCode: "1", cycle: "ele2026", electionId: "21270", uf: "pr", municipalities } as const;

test("collects one summary entry per municipality with the top candidates", async () => {
  const cache = createMemoryCache();
  const report = await collectMunicipalResults({ ...base, client: client(await curitiba()), cache, budgetMs: 5_000 });

  assert.deepEqual(report, { office: "president", attempted: 3, updated: 3, failed: 0, total: 3 });
  const summary = await readMunicipalSummary(cache, "president", "pr");
  assert.equal(Object.keys(summary?.entries ?? {}).length, 3);
  assert.equal(summary?.entries["75353"]?.name, "CURITIBA");
  assert.equal(summary?.entries["75353"]?.ibgeCode, "4106902");
  assert.ok((summary?.entries["75353"]?.candidates.length ?? 0) > 0);
  assert.equal(summary?.cursor, 0);
});

test("keeps the previous entry when a municipality fails or regresses", async () => {
  const cache = createMemoryCache();
  const payload = await curitiba();
  await collectMunicipalResults({ ...base, client: client(payload), cache, budgetMs: 5_000 });
  const before = await readMunicipalSummary(cache, "president", "pr");

  const report = await collectMunicipalResults({
    ...base,
    client: client(payload, { fail: new Set(["74012"]), time: (code) => (code === "76678" ? "00:00:01" : payload.ht) }),
    cache,
    budgetMs: 5_000
  });
  const after = await readMunicipalSummary(cache, "president", "pr");

  assert.equal(report.failed, 1);
  assert.equal(report.updated, 1);
  assert.deepEqual(after?.entries["74012"], before?.entries["74012"]);
  assert.deepEqual(after?.entries["76678"], before?.entries["76678"]);
});

test("resumes from the stored cursor when the time budget runs out", async () => {
  const cache = createMemoryCache();
  const requests: string[] = [];
  const report = await collectMunicipalResults({ ...base, client: client(await curitiba(), { requests }), cache, budgetMs: 0 });
  assert.equal(report.attempted, 0);

  await cache.set("results:municipal:v1:president:pr", {
    ...(await readMunicipalSummary(cache, "president", "pr")),
    cursor: 2
  });
  await collectMunicipalResults({ ...base, client: client(await curitiba(), { requests }), cache, budgetMs: 5_000, concurrency: 1 });
  assert.deepEqual(requests, ["76678", "74012", "75353"]);
});

test("parses only allowlisted municipal queries", async () => {
  const { parsePublicMunicipalQuery } = await import("../src/lib/tse/public-municipal");
  const parse = (query: string) => parsePublicMunicipalQuery(new URLSearchParams(query));
  assert.deepEqual(parse("office=president"), { success: true, office: "president", code: null });
  assert.deepEqual(parse("office=governor&code=75353"), { success: true, office: "governor", code: "75353" });
  assert.equal(parse("office=senator").success, false);
  assert.equal(parse("office=president&code=7535").success, false);
  assert.equal(parse("office=president&office=governor").success, false);
  assert.equal(parse("office=president&url=https://x").success, false);
});

test("builds a sorted overview with one leader per municipality", async () => {
  const { municipalOverview } = await import("../src/lib/tse/public-municipal");
  const cache = createMemoryCache();
  await collectMunicipalResults({ ...base, client: client(await curitiba()), cache, budgetMs: 5_000 });
  const overview = municipalOverview((await readMunicipalSummary(cache, "president", "pr"))!);
  assert.deepEqual(overview.map((item) => item.name), ["ABATIÁ", "CURITIBA", "LONDRINA"]);
  assert.ok(overview[0]?.leader);
});
