import { z } from "zod";
import type { CacheStore } from "../cache";
import { electionResultSchema } from "./result-schema";
import type { ElectionOffice, ElectionResult, ElectionScopeType } from "./types";

const SNAPSHOT_VERSION = 1;
const CACHE_PREFIX = "results:lkg:v1";

const identitySchema = z.object({
  scope: z.string().regex(/^(?:[A-Z]{2}|\d{4,5})$/),
  scopeType: z.enum(["country", "state", "municipality", "electoral-zone"]),
  office: z.enum(["president", "governor", "senator", "federal-deputy", "state-deputy"])
});

const snapshotSchema = z.object({
  version: z.literal(SNAPSHOT_VERSION),
  storedAt: z.string().datetime({ offset: true }),
  data: electionResultSchema
});

export type ElectionResultIdentity = {
  scope: string;
  scopeType: ElectionScopeType;
  office: ElectionOffice;
};

export type LastKnownGoodSnapshot = z.infer<typeof snapshotSchema>;

export type PromotionResult = {
  promoted: boolean;
  snapshot: LastKnownGoodSnapshot;
};

export function electionResultCacheKey(identity: ElectionResultIdentity): string {
  const parsed = identitySchema.parse(identity);
  return `${CACHE_PREFIX}:${parsed.office}:${parsed.scopeType}:${parsed.scope.toLowerCase()}`;
}

export async function readLastKnownGood(
  cache: CacheStore,
  identity: ElectionResultIdentity
): Promise<LastKnownGoodSnapshot | null> {
  const input = await cache.get<unknown>(electionResultCacheKey(identity));
  const result = snapshotSchema.safeParse(input);
  return result.success ? result.data : null;
}

function isRegression(current: ElectionResult, candidate: ElectionResult): boolean {
  if (current.phase === "official" && candidate.phase === "simulation") return true;
  if (current.phase === "simulation" && candidate.phase === "official") return false;

  const currentTime = Date.parse(current.updatedAt);
  const candidateTime = Date.parse(candidate.updatedAt);
  if (candidateTime < currentTime) return true;
  return candidateTime === currentTime && candidate.sourceId === current.sourceId;
}

export async function promoteLastKnownGood(
  cache: CacheStore,
  input: unknown,
  now: () => Date = () => new Date()
): Promise<PromotionResult> {
  const data = electionResultSchema.parse(input);
  const identity = { scope: data.scope, scopeType: data.scopeType, office: data.office };
  const current = await readLastKnownGood(cache, identity);

  if (current && isRegression(current.data, data)) {
    return { promoted: false, snapshot: current };
  }

  const snapshot: LastKnownGoodSnapshot = {
    version: SNAPSHOT_VERSION,
    storedAt: now().toISOString(),
    data
  };

  await cache.set(electionResultCacheKey(identity), snapshot);
  return { promoted: true, snapshot };
}
