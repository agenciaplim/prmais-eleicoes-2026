import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { parseTseJson, parseTsePayload, TsePayloadError, type TsePayloadKind } from "../src/lib/tse/parser";

const fixtures = [
  ["EA11", "ea11-election-config.json"],
  ["EA12", "ea12-pr-municipalities.json"],
  ["EA14", "ea14-br-progress.json"],
  ["EA15", "ea15-pr-progress.json"],
  ["EA20", "ea20-president-br.json"],
  ["EA20", "ea20-deputy-federal-pr.json"],
  ["EA20", "ea20-president-curitiba.json"]
] as const satisfies ReadonlyArray<readonly [TsePayloadKind, string]>;

function fixtureUrl(name: string): URL {
  return new URL(`./fixtures/tse/${name}`, import.meta.url);
}

async function readFixture(name: string): Promise<string> {
  return readFile(fileURLToPath(fixtureUrl(name)), "utf8");
}

test("parses every representative TSE fixture", async () => {
  for (const [kind, name] of fixtures) {
    const result = parseTseJson(kind, await readFixture(name));
    assert.equal(typeof result, "object", name);
  }
});

test("accepts the 7-digit IBGE code observed in EA12", async () => {
  const parsed = parseTseJson("EA12", await readFixture("ea12-pr-municipalities.json"));
  assert.equal(parsed.abr[0]?.mu[0]?.cdi, "4100103");
});

test("accepts an empty IBGE code for foreign EA12 localities", async () => {
  const raw = JSON.parse(await readFixture("ea12-pr-municipalities.json")) as {
    abr: Array<{ cd: string; ds: string; mu: Array<Record<string, unknown>> }>;
  };
  raw.abr.push({
    cd: "zz",
    ds: "EXTERIOR",
    mu: [{ cd: "29254", cdi: "", nm: "ABIDJA", c: "n", z: ["0001"] }]
  });

  const parsed = parseTsePayload("EA12", raw);
  assert.equal(parsed.abr[1]?.mu[0]?.cdi, "");
});

test("accepts EA14 Brazil progress without municipality counters", async () => {
  const raw = JSON.parse(await readFixture("ea14-br-progress.json")) as {
    abr: Array<Record<string, unknown>>;
  };
  for (const field of ["munnr", "pmunnr", "pmunnrn", "munpt", "pmunpt", "pmunptn", "munf", "pmunf", "pmunfn"]) {
    delete raw.abr[0]?.[field];
  }

  assert.equal(parseTsePayload("EA14", raw).abr[0]?.tpabr, "br");
});

test("accepts an empty federation number in EA20 party data", async () => {
  const raw = JSON.parse(await readFixture("ea20-deputy-federal-pr.json")) as {
    carg: Array<{ agr: Array<{ par: Array<{ nfed: string }> }> }>;
  };
  raw.carg[0]!.agr[0]!.par[0]!.nfed = "";

  const parsed = parseTsePayload("EA20", raw);
  assert.equal(parsed.carg?.[0]?.agr[0]?.par[0]?.nfed, "");
});

test("strips additive unknown fields instead of exposing them", async () => {
  const raw = JSON.parse(await readFixture("ea11-election-config.json")) as Record<string, unknown>;
  raw.futureField = "ignored";

  const parsed = parseTsePayload("EA11", raw) as Record<string, unknown>;
  assert.equal("futureField" in parsed, false);
});

test("rejects JSON numbers where TSE numeric strings are required", async () => {
  const raw = JSON.parse(await readFixture("ea20-president-br.json")) as { idg: unknown };
  raw.idg = 1005;

  assert.throws(
    () => parseTsePayload("EA20", raw),
    (error: unknown) => error instanceof TsePayloadError && error.code === "INVALID_SCHEMA"
  );
});

test("rejects impossible section arithmetic", async () => {
  const raw = JSON.parse(await readFixture("ea15-pr-progress.json")) as {
    abr: Array<{ s: { ts: string } }>;
  };
  raw.abr[0]!.s.ts = "11";

  assert.throws(
    () => parseTsePayload("EA15", raw),
    (error: unknown) =>
      error instanceof TsePayloadError &&
      error.issues.some((issue) => issue.path.join(".") === "abr.0.s.ts")
  );
});

test("rejects impossible vote arithmetic", async () => {
  const raw = JSON.parse(await readFixture("ea20-president-br.json")) as { v: { tv: string } };
  raw.v.tv = "50001";

  assert.throws(
    () => parseTsePayload("EA20", raw),
    (error: unknown) =>
      error instanceof TsePayloadError && error.issues.some((issue) => issue.path.join(".") === "v.tv")
  );
});

test("rejects a scope code that disagrees with its type", async () => {
  const raw = JSON.parse(await readFixture("ea20-president-curitiba.json")) as { cdabr: string };
  raw.cdabr = "pr";

  assert.throws(() => parseTsePayload("EA20", raw), TsePayloadError);
});

test("rejects malformed JSON without including its contents in the error", () => {
  const secretMarker = "do-not-log-this";

  assert.throws(
    () => parseTseJson("EA11", `{${secretMarker}`),
    (error: unknown) =>
      error instanceof TsePayloadError &&
      error.code === "INVALID_JSON" &&
      !error.message.includes(secretMarker)
  );
});
