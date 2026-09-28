import type { LocationCatalog } from "./location-catalog";

const ALLOWED_QUERY_PARAMETERS = new Set(["state"]);

export type PublicLocationQueryErrorCode = "UNKNOWN_PARAMETER" | "DUPLICATE_PARAMETER" | "INVALID_STATE";

export type PublicLocationQuery =
  | { success: true; state: string | null }
  | { success: false; code: PublicLocationQueryErrorCode };

export function parsePublicLocationQuery(searchParams: URLSearchParams): PublicLocationQuery {
  for (const parameter of searchParams.keys()) {
    if (!ALLOWED_QUERY_PARAMETERS.has(parameter)) {
      return { success: false, code: "UNKNOWN_PARAMETER" };
    }
  }

  const states = searchParams.getAll("state");
  if (states.length > 1) return { success: false, code: "DUPLICATE_PARAMETER" };
  if (states.length === 0) return { success: true, state: null };
  if (!/^[a-z]{2}$/.test(states[0]!)) return { success: false, code: "INVALID_STATE" };

  return { success: true, state: states[0]!.toUpperCase() };
}

function metadata(catalog: LocationCatalog) {
  return {
    sourceId: catalog.sourceId,
    electionId: catalog.electionId,
    phase: catalog.phase,
    generatedAt: catalog.generatedAt
  };
}

export function publicLocationPayload(catalog: LocationCatalog, stateCode: string | null) {
  if (stateCode === null) {
    return {
      ...metadata(catalog),
      states: catalog.states.map((state) => ({
        code: state.code,
        name: state.name,
        municipalityCount: state.municipalities.length
      }))
    };
  }

  const state = catalog.states.find((candidate) => candidate.code === stateCode);
  return state ? { ...metadata(catalog), state } : null;
}
