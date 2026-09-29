import { z } from "zod";
import type { CacheStore } from "../cache";
import type { TseClient } from "./client";
import { normalizeEa20 } from "./normalizer";
import type { Ea20Payload } from "./schemas";
import type { ElectionResult } from "./types";

const SUMMARY_VERSION = 1;
const CACHE_PREFIX = "results:municipal:v1";
const TOP_CANDIDATES = 5;

export const municipalOffices = ["president", "governor"] as const;
export type MunicipalOffice = (typeof municipalOffices)[number];

const candidateSchema = z.object({
  number: z.string().regex(/^\d+$/),
  name: z.string().min(1),
  party: z.string().min(1),
  votes: z.number().int().min(0),
  percentage: z.number().min(0).max(100),
  elected: z.boolean()
});

const entrySchema = z.object({
  tseCode: z.string().regex(/^\d{5}$/),
  ibgeCode: z.string().regex(/^\d{7}$/),
  name: z.string().min(1),
  sourceId: z.string().regex(/^\d+$/),
  phase: z.enum(["simulation", "official"]),
  status: z.enum(["not-started", "in-progress", "finished"]),
  final: z.boolean(),
  progress: z.number().min(0).max(100),
  updatedAt: z.string().datetime({ offset: true }),
  candidates: z.array(candidateSchema).max(TOP_CANDIDATES)
});

const summarySchema = z.object({
  version: z.literal(SUMMARY_VERSION),
  office: z.enum(municipalOffices),
  uf: z.string().regex(/^[a-z]{2}$/),
  storedAt: z.string().datetime({ offset: true }),
  cursor: z.number().int().min(0),
  entries: z.record(z.string().regex(/^\d{5}$/), entrySchema)
});

export type MunicipalEntry = z.infer<typeof entrySchema>;
export type MunicipalSummary = z.infer<typeof summarySchema>;
export type MunicipalityRef = { tseCode: string; ibgeCode: string; name: string };

export type MunicipalCollectionReport = {
  office: MunicipalOffice;
  attempted: number;
  updated: number;
  failed: number;
  total: number;
};

export const municipalSummaryKey = (office: MunicipalOffice, uf: string) => `${CACHE_PREFIX}:${office}:${uf.toLowerCase()}`;

export async function readMunicipalSummary(cache: CacheStore, office: MunicipalOffice, uf: string): Promise<MunicipalSummary | null> {
  const result = summarySchema.safeParse(await cache.get<unknown>(municipalSummaryKey(office, uf)));
  return result.success ? result.data : null;
}

export function entryFromResult(result: ElectionResult, municipality: MunicipalityRef): MunicipalEntry {
  return entrySchema.parse({
    tseCode: municipality.tseCode,
    ibgeCode: municipality.ibgeCode,
    name: municipality.name,
    sourceId: result.sourceId,
    phase: result.phase,
    status: result.status,
    final: result.final,
    progress: result.progress,
    updatedAt: result.updatedAt,
    candidates: result.candidates.slice(0, TOP_CANDIDATES).map((candidate) => ({
      number: candidate.number,
      name: candidate.name,
      party: candidate.party,
      votes: candidate.votes,
      percentage: candidate.percentage,
      elected: candidate.elected
    }))
  });
}

// Same rule as the aggregated last-known-good: never go back to simulation or to an older totalization.
export function isEntryRegression(current: MunicipalEntry | undefined, candidate: MunicipalEntry): boolean {
  if (!current) return false;
  if (current.phase === "official" && candidate.phase === "simulation") return true;
  if (current.phase === "simulation" && candidate.phase === "official") return false;
  return Date.parse(candidate.updatedAt) < Date.parse(current.updatedAt);
}

async function runPool<T>(items: T[], concurrency: number, deadline: number, work: (item: T) => Promise<void>): Promise<number> {
  let next = 0;
  async function worker() {
    while (next < items.length && Date.now() < deadline) {
      const item = items[next++]!;
      await work(item);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return next;
}

// Fetches one EA20 per municipality, starting at the stored cursor and stopping at the time budget.
// Failed or regressing municipalities keep their previous entry; the summary is written once per run.
export async function collectMunicipalResults(options: {
  client: TseClient;
  cache: CacheStore;
  office: MunicipalOffice;
  officeCode: string;
  cycle: string;
  electionId: string;
  uf: string;
  municipalities: MunicipalityRef[];
  budgetMs: number;
  concurrency?: number;
  now?: () => Date;
}): Promise<MunicipalCollectionReport> {
  const now = options.now ?? (() => new Date());
  const uf = options.uf.toLowerCase();
  const municipalities = [...options.municipalities].sort((a, b) => a.tseCode.localeCompare(b.tseCode));
  const total = municipalities.length;
  const current = await readMunicipalSummary(options.cache, options.office, uf);
  const entries: Record<string, MunicipalEntry> = { ...(current?.entries ?? {}) };
  const start = total > 0 ? (current?.cursor ?? 0) % total : 0;
  const ordered = [...municipalities.slice(start), ...municipalities.slice(0, start)];
  let updated = 0;
  let failed = 0;

  const attempted = await runPool(ordered, options.concurrency ?? 8, Date.now() + options.budgetMs, async (municipality) => {
    try {
      const payload = (await options.client.fetchPayload({
        kind: "EA20",
        cycle: options.cycle,
        electionId: options.electionId,
        officeCode: options.officeCode,
        scope: { type: "municipality", uf, municipalityCode: municipality.tseCode }
      })) as Ea20Payload;
      const result = normalizeEa20(payload).find((item) => item.office === options.office);
      if (!result) throw new Error("office missing");
      const entry = entryFromResult(result, municipality);
      if (isEntryRegression(entries[municipality.tseCode], entry)) return;
      entries[municipality.tseCode] = entry;
      updated++;
    } catch {
      failed++;
    }
  });

  if (updated > 0 || !current) {
    const summary: MunicipalSummary = summarySchema.parse({
      version: SUMMARY_VERSION,
      office: options.office,
      uf,
      storedAt: now().toISOString(),
      cursor: total > 0 ? (start + attempted) % total : 0,
      entries
    });
    await options.cache.set(municipalSummaryKey(options.office, uf), summary);
  }

  return { office: options.office, attempted, updated, failed, total };
}
