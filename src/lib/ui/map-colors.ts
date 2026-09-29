export type OverviewItem = {
  tseCode: string;
  ibgeCode: string;
  name: string;
  progress: number;
  leader: { name: string; party: string; percentage: number } | null;
};

export const LEADER_COLORS = ["#013fa2", "#ff6c00", "#0bdb15"] as const;
export const OTHER_COLOR = "#7b8494";
export const NO_DATA_COLOR = "#dddfd2";

export type MapColoring = {
  legend: { label: string; color: string }[];
  byIbge: Map<string, { color: string; item: OverviewItem }>;
};

// The three candidates leading in the most municipalities get brand colors; the rest are "Outros".
export function colorMunicipalities(items: OverviewItem[]): MapColoring {
  const wins = new Map<string, number>();
  for (const item of items) if (item.leader) wins.set(item.leader.name, (wins.get(item.leader.name) ?? 0) + 1);
  const ranked = [...wins.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([name]) => name);
  const colorOf = new Map(ranked.slice(0, LEADER_COLORS.length).map((name, index) => [name, LEADER_COLORS[index]!]));

  const byIbge = new Map<string, { color: string; item: OverviewItem }>();
  for (const item of items) {
    const color = item.leader ? colorOf.get(item.leader.name) ?? OTHER_COLOR : NO_DATA_COLOR;
    byIbge.set(item.ibgeCode, { color, item });
  }

  return {
    legend: [
      ...ranked.slice(0, LEADER_COLORS.length).map((name) => ({ label: name, color: colorOf.get(name)! })),
      ...(ranked.length > LEADER_COLORS.length ? [{ label: "Outros", color: OTHER_COLOR }] : []),
      { label: "Sem dados", color: NO_DATA_COLOR }
    ],
    byIbge
  };
}

export function parseOverview(input: unknown): OverviewItem[] | null {
  if (typeof input !== "object" || input === null || !Array.isArray((input as { items?: unknown }).items)) return null;
  return (input as { items: unknown[] }).items.flatMap((raw) => {
    if (typeof raw !== "object" || raw === null) return [];
    const item = raw as Record<string, unknown>;
    if (typeof item.tseCode !== "string" || typeof item.ibgeCode !== "string" || typeof item.name !== "string" || typeof item.progress !== "number") return [];
    const leader = item.leader as Record<string, unknown> | null;
    const validLeader =
      leader && typeof leader.name === "string" && typeof leader.party === "string" && typeof leader.percentage === "number"
        ? { name: leader.name, party: leader.party, percentage: leader.percentage }
        : null;
    return [{ tseCode: item.tseCode, ibgeCode: item.ibgeCode, name: item.name, progress: item.progress, leader: validLeader }];
  });
}
