import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { createMemoryCache } from "../src/lib/cache";
import { TseFetchError, type TseClient, type TseFileRequest, type TsePhotoRequest } from "../src/lib/tse/client";
import {
  collectElectionResults,
  collectorConfigFromEnv,
  discoverElections,
  TseCollectorError
} from "../src/lib/tse/collector";
import { readLastKnownGood } from "../src/lib/tse/last-known-good";
import { readLocationCatalog } from "../src/lib/tse/location-catalog";
import { parseTseJson } from "../src/lib/tse/parser";
import { readUpdates } from "../src/lib/tse/updates";
import type { Ea11Payload, Ea12Payload, Ea20Payload } from "../src/lib/tse/schemas";

async function fixture(name: string): Promise<string> {
  const url = new URL(`./fixtures/tse/${name}`, import.meta.url);
  return readFile(fileURLToPath(url), "utf8");
}

async function collectorPayloads() {
  const ea11 = parseTseJson("EA11", await fixture("ea11-election-config.json"));
  const ea12 = parseTseJson("EA12", await fixture("ea12-pr-municipalities.json"));
  const president = parseTseJson("EA20", await fixture("ea20-president-br.json"));
  const deputy = parseTseJson("EA20", await fixture("ea20-deputy-federal-pr.json"));

  function majoritarian(officeCode: "1" | "3" | "5", sourceId: string): Ea20Payload {
    const payload = structuredClone(president);
    payload.idg = sourceId;
    payload.tpabr = "uf";
    payload.cdabr = "pr";
    if (officeCode !== "1") payload.ele = "21272";
    payload.carg![0]!.cd = officeCode;
    payload.carg![0]!.nmn = officeCode === "3" ? "Governador" : officeCode === "5" ? "Senador" : "Presidente";
    return payload;
  }

  function proportional(officeCode: "6" | "7", sourceId: string): Ea20Payload {
    const payload = structuredClone(deputy);
    payload.idg = sourceId;
    payload.carg![0]!.cd = officeCode;
    payload.carg![0]!.nmn = officeCode === "6" ? "Deputado Federal" : "Deputado Estadual";
    return payload;
  }

  const payloadByTarget = new Map<string, Ea20Payload>([
    ["1:country", president],
    ["1:state", majoritarian("1", "1008")],
    ["3:state", majoritarian("3", "1009")],
    ["5:state", majoritarian("5", "1010")],
    ["6:state", proportional("6", "1011")],
    ["7:state", proportional("7", "1012")]
  ]);

  return { ea11, ea12, payloadByTarget };
}

function fakeClient(
  ea11: Ea11Payload,
  ea12: Ea12Payload,
  payloadByTarget: Map<string, Ea20Payload>,
  failOffice?: string,
  requests: TseFileRequest[] = [],
  failCatalog = false,
  photoRequests: TsePhotoRequest[] = []
): TseClient {
  return {
    buildUrl() {
      throw new Error("not used by collector");
    },
    async fetchPayload(request: TseFileRequest) {
      requests.push(request);
      if (request.kind === "EA11") return ea11;
      if (request.kind === "EA12") {
        if (failCatalog) throw new TseFetchError("TIMEOUT", "simulated catalog timeout");
        return ea12;
      }
      if (request.kind !== "EA20") throw new Error("unexpected request kind");
      if (request.officeCode === failOffice) throw new TseFetchError("TIMEOUT", "simulated timeout");
      const payload = payloadByTarget.get(`${request.officeCode}:${request.scope.type}`);
      if (!payload) throw new Error("missing fake payload");
      return payload;
    },
    buildPhotoUrl() {
      throw new Error("not used by collector");
    },
    async fetchPhoto(request: TsePhotoRequest) {
      photoRequests.push(request);
      return new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00]);
    }
  } as TseClient;
}

test("discovers first and second-round election IDs from EA11", async () => {
  const { ea11 } = await collectorPayloads();

  assert.deepEqual(discoverElections(ea11, { uf: "pr", round: "1" }), {
    eventId: "17801",
    cycle: "ele2026",
    round: "1",
    federalElectionId: "21270",
    stateElectionId: "21272"
  });
  assert.deepEqual(discoverElections(ea11, { uf: "pr", round: "2" }), {
    eventId: "17801",
    cycle: "ele2026",
    round: "2",
    federalElectionId: "21271",
    stateElectionId: "21273"
  });
});

test("requires an event ID when more than one EA11 event matches", async () => {
  const { ea11 } = await collectorPayloads();
  const ambiguous = structuredClone(ea11);
  ambiguous.pl.push({ ...structuredClone(ambiguous.pl[0]!), cd: "17802" });

  assert.throws(
    () => discoverElections(ambiguous, { uf: "pr", round: "1" }),
    (error: unknown) => error instanceof TseCollectorError && error.code === "AMBIGUOUS_ELECTION"
  );
  assert.equal(discoverElections(ambiguous, { uf: "pr", round: "1", eventId: "17802" }).eventId, "17802");
});

test("collects and promotes all six first-round aggregate targets", async () => {
  const { ea11, ea12, payloadByTarget } = await collectorPayloads();
  const cache = createMemoryCache();
  const requests: TseFileRequest[] = [];
  const client = fakeClient(ea11, ea12, payloadByTarget, undefined, requests);

  const report = await collectElectionResults({ client, cache, config: { uf: "pr", round: "1" } });

  assert.equal(report.catalog.status, "promoted");
  assert.equal(report.items.length, 6);
  assert.equal(report.items.every((item) => item.status === "promoted"), true);
  assert.deepEqual(
    requests.filter((request) => request.kind === "EA20").map((request) => request.officeCode),
    ["1", "1", "3", "5", "6", "7"]
  );
  assert.notEqual(
    await readLastKnownGood(cache, { scope: "BR", scopeType: "country", office: "president" }),
    null
  );
  assert.notEqual(
    await readLastKnownGood(cache, { scope: "PR", scopeType: "state", office: "state-deputy" }),
    null
  );
  assert.equal((await readLocationCatalog(cache))?.data.states[0]?.municipalities.length, 3);
  assert.deepEqual(
    requests.find((request) => request.kind === "EA12"),
    { kind: "EA12", cycle: "ele2026", electionId: "21272" }
  );

  const updates = await readUpdates(cache);
  assert.ok(updates.length > 0);
  assert.ok((report.photos?.fetched ?? 0) > 0);

  const repeated = await collectElectionResults({ client, cache, config: { uf: "pr", round: "1" } });
  assert.deepEqual(await readUpdates(cache), updates);
  assert.equal(repeated.catalog.status, "unchanged");
  assert.equal(repeated.items.every((item) => item.status === "unchanged"), true);
});

test("isolates one target failure and promotes the remaining results", async () => {
  const { ea11, ea12, payloadByTarget } = await collectorPayloads();
  const cache = createMemoryCache();
  const client = fakeClient(ea11, ea12, payloadByTarget, "5");

  const report = await collectElectionResults({ client, cache, config: { uf: "pr", round: "1" } });
  const senator = report.items.find((item) => item.office === "senator");

  assert.deepEqual(senator, { office: "senator", scope: "PR", status: "failed", errorCode: "fetch:TIMEOUT" });
  assert.equal(report.items.filter((item) => item.status === "promoted").length, 5);
});

test("isolates a catalog failure and still promotes election results", async () => {
  const { ea11, ea12, payloadByTarget } = await collectorPayloads();
  const cache = createMemoryCache();
  const client = fakeClient(ea11, ea12, payloadByTarget, undefined, [], true);

  const report = await collectElectionResults({ client, cache, config: { uf: "pr", round: "1" } });

  assert.deepEqual(report.catalog, { status: "failed", errorCode: "fetch:TIMEOUT" });
  assert.equal(report.items.every((item) => item.status === "promoted"), true);
  assert.equal(await readLocationCatalog(cache), null);
});

test("validates collector environment settings", () => {
  assert.deepEqual(collectorConfigFromEnv({ TSE_UF: "PR", TSE_ROUND: "1", TSE_PLEITO_ID: "17801" }), {
    uf: "pr",
    round: "1",
    eventId: "17801",
    municipalBudgetMs: 20000
  });
  assert.equal(collectorConfigFromEnv({ TSE_UF: "PR", TSE_ROUND: "1", TSE_MUNICIPAL_BUDGET_MS: "0" }).municipalBudgetMs, 0);
  assert.throws(() => collectorConfigFromEnv({ TSE_UF: "PR", TSE_ROUND: "3" }), TseCollectorError);
  assert.throws(() => collectorConfigFromEnv({ TSE_UF: "PR", TSE_ROUND: "1", TSE_MUNICIPAL_BUDGET_MS: "90000" }), TseCollectorError);
});
