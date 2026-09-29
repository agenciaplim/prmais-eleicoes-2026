import assert from "node:assert/strict";
import { test } from "node:test";
import { filterMunicipalities, parseLocationOptions, parseMunicipalDetail } from "../src/lib/ui/municipality-search";

const options = [
  { tseCode: "75353", ibgeCode: "4106902", name: "CURITIBA" },
  { tseCode: "77771", ibgeCode: "4115200", name: "MARINGÁ" },
  { tseCode: "74012", ibgeCode: "4100103", name: "ABATIÁ" },
  { tseCode: "76090", ibgeCode: "4104808", name: "CAMPO LARGO" }
];

test("filters by accent-insensitive prefix, then substring", () => {
  assert.deepEqual(filterMunicipalities(options, "maringa").map((o) => o.name), ["MARINGÁ"]);
  assert.deepEqual(filterMunicipalities(options, "ca").map((o) => o.name), ["CAMPO LARGO"]);
  assert.deepEqual(filterMunicipalities(options, "ti").map((o) => o.name), ["CURITIBA", "ABATIÁ"]);
  assert.deepEqual(filterMunicipalities(options, "  "), []);
});

test("accepts only well-formed catalog entries", () => {
  const parsed = parseLocationOptions({ state: { municipalities: [options[0], { tseCode: "x", name: 1 }] } });
  assert.deepEqual(parsed, [options[0]]);
  assert.deepEqual(parseLocationOptions({ error: "unavailable" }), []);
});

test("rejects malformed municipal details", () => {
  assert.equal(parseMunicipalDetail(null), null);
  assert.equal(parseMunicipalDetail({ tseCode: "75353", name: "CURITIBA" }), null);
  const detail = parseMunicipalDetail({
    tseCode: "75353",
    name: "CURITIBA",
    progress: 62.14,
    updatedAt: "2026-10-04T18:43:00-03:00",
    candidates: [{ number: "10", name: "A", party: "PA", votes: 10, percentage: 40.21, elected: false }, { name: "<b>" }]
  });
  assert.equal(detail?.candidates.length, 1);
});
