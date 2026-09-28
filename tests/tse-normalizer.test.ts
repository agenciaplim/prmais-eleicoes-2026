import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { normalizeEa20, TseNormalizationError } from "../src/lib/tse/normalizer";
import { parseTseJson } from "../src/lib/tse/parser";

async function readEa20Fixture(name: string) {
  const url = new URL(`./fixtures/tse/${name}`, import.meta.url);
  return parseTseJson("EA20", await readFile(fileURLToPath(url), "utf8"));
}

test("normalizes a national presidential result", async () => {
  const [result] = normalizeEa20(await readEa20Fixture("ea20-president-br.json"));

  assert.deepEqual(
    {
      electionId: result?.electionId,
      round: result?.round,
      phase: result?.phase,
      scope: result?.scope,
      scopeType: result?.scopeType,
      office: result?.office,
      generatedAt: result?.generatedAt,
      updatedAt: result?.updatedAt,
      status: result?.status,
      final: result?.final,
      progress: result?.progress
    },
    {
      electionId: "21270",
      round: 1,
      phase: "simulation",
      scope: "BR",
      scopeType: "country",
      office: "president",
      generatedAt: "2026-09-28T15:30:00-03:00",
      updatedAt: "2026-09-28T15:29:45-03:00",
      status: "in-progress",
      final: false,
      progress: 58
    }
  );
  assert.deepEqual(result?.sections, { total: 100, totalized: 58, pending: 42 });
  assert.deepEqual(result?.candidates[0], {
    id: "10000000001",
    number: "10",
    name: "CANDIDATA UM",
    fullName: "CANDIDATA UM",
    party: "PA",
    partyName: "PARTIDO A",
    votes: 30000,
    percentage: 62.5,
    rank: 1,
    elected: false,
    status: "pending",
    destination: "valid",
    runningMates: [
      {
        id: "10000000002",
        name: "VICE UM",
        fullName: "VICE UM",
        party: "PA",
        role: "vice"
      }
    ],
    substitutes: []
  });
  assert.equal(result?.candidates[2]?.destination, "annulled-sub-judice");
  assert.equal(result?.candidates[2]?.substitutes[0]?.name, "SUBSTITUÍDO");
});

test("normalizes proportional metadata and candidate statuses", async () => {
  const [result] = normalizeEa20(await readEa20Fixture("ea20-deputy-federal-pr.json"));

  assert.equal(result?.office, "federal-deputy");
  assert.equal(result?.scope, "PR");
  assert.equal(result?.seats, 30);
  assert.equal(result?.electoralQuotient, 10000);
  assert.equal(result?.status, "finished");
  assert.equal(result?.final, true);
  assert.equal(result?.candidates[0]?.status, "elected-by-quotient");
  assert.equal(result?.candidates[0]?.elected, true);
  assert.equal(result?.candidates[1]?.status, "alternate");
  assert.equal(result?.candidates[2]?.destination, "annulled");
  assert.deepEqual(result?.votes, {
    total: 20000,
    candidateVotes: 19000,
    valid: 18000,
    nominal: 16000,
    partyList: 2000,
    annulled: 1000,
    annulledSubJudice: 0,
    blank: 500,
    nullVotes: 500,
    regularNull: 500,
    technicalNull: 0,
    canceledWithoutValidity: 0,
    withoutAnnulment: 19000
  });
});

test("normalizes a municipal scope and keeps its TSE code", async () => {
  const [result] = normalizeEa20(await readEa20Fixture("ea20-president-curitiba.json"));

  assert.equal(result?.scopeType, "municipality");
  assert.equal(result?.scope, "75353");
  assert.equal(result?.updatedAt, "2026-09-28T15:30:45-03:00");
});

test("falls back to file generation time before the first totalization", async () => {
  const payload = await readEa20Fixture("ea20-president-br.json");
  payload.dt = "";
  payload.ht = "";

  const [result] = normalizeEa20(payload);
  assert.equal(result?.updatedAt, result?.generatedAt);
});

test("rejects valid EA20 payloads outside the PR+ result model", async () => {
  const payload = await readEa20Fixture("ea20-president-br.json");
  delete payload.carg;
  payload.perg = [
    {
      cd: "1",
      ds: "CONSULTA",
      resp: [{ n: "1", ds: "SIM", seq: "1", e: "n", st: "", vap: "0", pvap: "0,00", pvapn: "0" }]
    }
  ];

  assert.throws(
    () => normalizeEa20(payload),
    (error: unknown) => error instanceof TseNormalizationError && error.code === "UNSUPPORTED_PAYLOAD"
  );
});

test("rejects office codes outside the PR+ result model", async () => {
  const payload = await readEa20Fixture("ea20-president-br.json");
  payload.carg![0]!.cd = "99";

  assert.throws(
    () => normalizeEa20(payload),
    (error: unknown) => error instanceof TseNormalizationError && error.code === "UNSUPPORTED_OFFICE"
  );
});
