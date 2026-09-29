import { loadPublicResult, type LoadedPublicResult } from "./public-result-loader";
import type { ElectionResultIdentity } from "./last-known-good";

export const homeResultIdentities = {
  presidentBr: { scope: "BR", scopeType: "country", office: "president" },
  presidentPr: { scope: "PR", scopeType: "state", office: "president" },
  governor: { scope: "PR", scopeType: "state", office: "governor" },
  senator: { scope: "PR", scopeType: "state", office: "senator" },
  federalDeputy: { scope: "PR", scopeType: "state", office: "federal-deputy" },
  stateDeputy: { scope: "PR", scopeType: "state", office: "state-deputy" }
} as const satisfies Record<string, ElectionResultIdentity>;

export type HomeResults = Record<keyof typeof homeResultIdentities, LoadedPublicResult>;

// Each result is read independently from the cache; one failure never blanks the others.
export async function loadHomeResults(load: typeof loadPublicResult = loadPublicResult): Promise<HomeResults> {
  const entries = await Promise.all(
    Object.entries(homeResultIdentities).map(async ([key, identity]) => {
      try {
        return [key, await load({ ...identity }, key === "presidentBr")] as const;
      } catch {
        return [key, { source: "unavailable" } as const] as const;
      }
    })
  );
  return Object.fromEntries(entries) as HomeResults;
}
