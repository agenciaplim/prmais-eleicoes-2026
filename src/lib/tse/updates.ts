import { z } from "zod";
import type { CacheStore } from "../cache";
import type { ElectionResult } from "./types";

const UPDATES_KEY = "updates:v1";
const MAX_ITEMS = 30;
const MILESTONES = [10, 25, 50, 60, 75, 90, 95, 100];

const itemSchema = z.object({
  id: z.string().min(1).max(200),
  at: z.string().datetime({ offset: true }),
  text: z.string().min(1).max(300)
});
const logSchema = z.object({ version: z.literal(1), items: z.array(itemSchema).max(MAX_ITEMS) });

export type UpdateItem = z.infer<typeof itemSchema>;

const officeLabel: Record<ElectionResult["office"], string> = {
  president: "Presidente",
  governor: "Governador",
  senator: "Senado",
  "federal-deputy": "Deputado Federal",
  "state-deputy": "Deputado Estadual"
};

const place = (result: ElectionResult) => (result.scopeType === "country" ? "em todo o país" : "no Paraná");

// Editorial-style events derived only from TSE data; the id makes each event idempotent.
export function deriveUpdates(previous: ElectionResult | null, next: ElectionResult): UpdateItem[] {
  if (previous && previous.phase !== next.phase) previous = null;
  const events: UpdateItem[] = [];
  const key = `${next.phase}:${next.round}:${next.office}:${next.scope}`;
  const label = officeLabel[next.office];

  // Progress milestones only for the reference office of each scope.
  const national = next.office === "president" && next.scopeType === "country";
  const state = next.office === "governor" && next.scopeType === "state";
  if (national || state) {
    const reached = MILESTONES.filter((m) => next.progress >= m && (previous?.progress ?? 0) < m).pop();
    if (reached !== undefined && reached < 100) {
      events.push({
        id: `${next.phase}:${next.round}:progress:${next.scope}:${reached}`,
        at: next.updatedAt,
        text: national ? `${reached}% das seções apuradas em todo o país.` : `Paraná ultrapassa ${reached}% das seções apuradas.`
      });
    }
  }

  const leader = next.candidates[0];
  const previousLeader = previous?.candidates[0];
  if (next.office !== "federal-deputy" && next.office !== "state-deputy" && leader && leader.votes > 0) {
    if (!previousLeader || previousLeader.votes === 0) {
      events.push({ id: `${key}:first-leader`, at: next.updatedAt, text: `${leader.name} (${leader.party}) sai na frente para ${label} ${place(next)}.` });
    } else if (previousLeader.id !== leader.id) {
      events.push({ id: `${key}:leader:${leader.id}:${next.sourceId}`, at: next.updatedAt, text: `${leader.name} (${leader.party}) assume a liderança para ${label} ${place(next)}.` });
    }
  }

  if (next.final && !previous?.final) {
    const elected = next.candidates.filter((c) => c.elected);
    const runoff = next.candidates.filter((c) => c.status === "runoff");
    const text =
      next.office !== "federal-deputy" && next.office !== "state-deputy" && runoff.length === 2
        ? `${label}: ${runoff[0]!.name} e ${runoff[1]!.name} disputam o 2º turno.`
        : next.office !== "federal-deputy" && next.office !== "state-deputy" && elected.length > 0
          ? `${elected.map((c) => c.name).join(" e ")} ${elected.length > 1 ? "eleitos" : "eleito(a)"} para ${label}.`
          : `Apuração para ${label} encerrada ${place(next)}.`;
    events.push({ id: `${key}:final`, at: next.updatedAt, text });
  }

  return events;
}

export async function readUpdates(cache: CacheStore): Promise<UpdateItem[]> {
  const parsed = logSchema.safeParse(await cache.get<unknown>(UPDATES_KEY));
  return parsed.success ? parsed.data.items : [];
}

export async function appendUpdates(cache: CacheStore, events: UpdateItem[]): Promise<number> {
  if (events.length === 0) return 0;
  const current = await readUpdates(cache);
  const known = new Set(current.map((item) => item.id));
  const fresh = events.filter((event) => !known.has(event.id)).map((event) => itemSchema.parse(event));
  if (fresh.length === 0) return 0;
  const items = [...fresh, ...current]
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, MAX_ITEMS);
  await cache.set(UPDATES_KEY, { version: 1, items });
  return fresh.length;
}
