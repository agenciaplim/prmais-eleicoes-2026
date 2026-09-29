import assert from "node:assert/strict";
import { test } from "node:test";
import { colorMunicipalities, LEADER_COLORS, NO_DATA_COLOR, OTHER_COLOR, parseOverview, type OverviewItem } from "../src/lib/ui/map-colors";

const item = (ibgeCode: string, leader: string | null): OverviewItem => ({
  tseCode: ibgeCode.slice(2),
  ibgeCode,
  name: `M${ibgeCode}`,
  progress: 50,
  leader: leader ? { name: leader, party: "P", percentage: 40 } : null
});

test("colors the three candidates leading in more municipalities and groups the rest", () => {
  const items = [item("4100001", "A"), item("4100002", "A"), item("4100003", "B"), item("4100004", "C"), item("4100005", "D"), item("4100006", null)];
  const coloring = colorMunicipalities(items);
  assert.equal(coloring.byIbge.get("4100001")?.color, LEADER_COLORS[0]);
  assert.equal(coloring.byIbge.get("4100005")?.color, OTHER_COLOR);
  assert.equal(coloring.byIbge.get("4100006")?.color, NO_DATA_COLOR);
  assert.deepEqual(coloring.legend.map((entry) => entry.label), ["A", "B", "C", "Outros", "Sem dados"]);
});

test("ignores malformed overview items", () => {
  assert.equal(parseOverview({ error: "x" }), null);
  const parsed = parseOverview({ items: [item("4100001", "A"), { name: 1 }, { ...item("4100002", null), leader: { name: 3 } }] });
  assert.equal(parsed?.length, 2);
  assert.equal(parsed?.[1]?.leader, null);
});
