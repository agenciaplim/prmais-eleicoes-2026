import { z } from "zod";
import type { CacheStore } from "../cache";
import type { Ea12Payload } from "./schemas";

const SNAPSHOT_VERSION = 1;
const LOCATION_CATALOG_CACHE_KEY = "locations:lkg:v1";
const BRASILIA_OFFSET = "-03:00";

const municipalitySchema = z.object({
  tseCode: z.string().regex(/^\d{5}$/),
  ibgeCode: z.string().regex(/^\d{7}$/),
  name: z.string().min(1).max(200),
  capital: z.boolean(),
  zones: z.array(z.string().regex(/^\d{4}$/)).min(1)
});

const stateSchema = z
  .object({
    code: z.string().regex(/^(?!ZZ$)[A-Z]{2}$/),
    name: z.string().min(1).max(200),
    municipalities: z.array(municipalitySchema).min(1).max(1_000)
  })
  .superRefine((state, ctx) => {
    const tseCodes = new Set<string>();
    const ibgeCodes = new Set<string>();
    for (const [index, municipality] of state.municipalities.entries()) {
      if (tseCodes.has(municipality.tseCode)) {
        ctx.addIssue({ code: "custom", path: ["municipalities", index, "tseCode"], message: "duplicate TSE code" });
      }
      if (ibgeCodes.has(municipality.ibgeCode)) {
        ctx.addIssue({ code: "custom", path: ["municipalities", index, "ibgeCode"], message: "duplicate IBGE code" });
      }
      tseCodes.add(municipality.tseCode);
      ibgeCodes.add(municipality.ibgeCode);
    }
  });

export const locationCatalogSchema = z
  .object({
    sourceId: z.string().regex(/^\d+$/),
    electionId: z.string().regex(/^\d+$/),
    phase: z.enum(["simulation", "official"]),
    generatedAt: z.string().datetime({ offset: true }),
    states: z.array(stateSchema).min(1).max(27)
  })
  .superRefine((catalog, ctx) => {
    const stateCodes = new Set<string>();
    for (const [index, state] of catalog.states.entries()) {
      if (stateCodes.has(state.code)) {
        ctx.addIssue({ code: "custom", path: ["states", index, "code"], message: "duplicate state code" });
      }
      stateCodes.add(state.code);
    }
  });

const snapshotSchema = z.object({
  version: z.literal(SNAPSHOT_VERSION),
  storedAt: z.string().datetime({ offset: true }),
  data: locationCatalogSchema
});

export type LocationCatalog = z.infer<typeof locationCatalogSchema>;
export type LocationCatalogSnapshot = z.infer<typeof snapshotSchema>;
export type LocationCatalogPromotion = { promoted: boolean; snapshot: LocationCatalogSnapshot };

function toTimestamp(date: string, time: string): string {
  const [day, month, year] = date.split("/");
  return `${year}-${month}-${day}T${time}${BRASILIA_OFFSET}`;
}

export function normalizeEa12Catalog(payload: Ea12Payload, electionId: string): LocationCatalog {
  return locationCatalogSchema.parse({
    sourceId: payload.idg,
    electionId,
    phase: payload.f === "s" ? "simulation" : "official",
    generatedAt: toTimestamp(payload.dg, payload.hg),
    states: payload.abr
      .filter((scope) => scope.cd !== "zz")
      .map((scope) => ({
        code: scope.cd.toUpperCase(),
        name: scope.ds,
        municipalities: scope.mu.map((municipality) => ({
          tseCode: municipality.cd,
          ibgeCode: municipality.cdi,
          name: municipality.nm,
          capital: municipality.c === "s",
          zones: [...municipality.z]
        }))
      }))
  });
}

export async function readLocationCatalog(cache: CacheStore): Promise<LocationCatalogSnapshot | null> {
  const input = await cache.get<unknown>(LOCATION_CATALOG_CACHE_KEY);
  const result = snapshotSchema.safeParse(input);
  return result.success ? result.data : null;
}

function isRegression(current: LocationCatalog, candidate: LocationCatalog): boolean {
  if (current.phase === "official" && candidate.phase === "simulation") return true;
  if (current.phase === "simulation" && candidate.phase === "official") return false;

  const currentTime = Date.parse(current.generatedAt);
  const candidateTime = Date.parse(candidate.generatedAt);
  if (candidateTime < currentTime) return true;
  return candidateTime === currentTime && candidate.sourceId === current.sourceId;
}

export async function promoteLocationCatalog(
  cache: CacheStore,
  input: unknown,
  now: () => Date = () => new Date()
): Promise<LocationCatalogPromotion> {
  const data = locationCatalogSchema.parse(input);
  const current = await readLocationCatalog(cache);
  if (current && isRegression(current.data, data)) {
    return { promoted: false, snapshot: current };
  }

  const snapshot: LocationCatalogSnapshot = {
    version: SNAPSHOT_VERSION,
    storedAt: now().toISOString(),
    data
  };
  await cache.set(LOCATION_CATALOG_CACHE_KEY, snapshot);
  return { promoted: true, snapshot };
}
