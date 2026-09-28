import type { ElectionResultIdentity } from "./last-known-good";

const DEFAULT_RESULT_KEY = "president:br";
const ALLOWED_QUERY_PARAMETERS = new Set(["office", "scope"]);

const publicResultIdentities = {
  [DEFAULT_RESULT_KEY]: { scope: "BR", scopeType: "country", office: "president" },
  "president:pr": { scope: "PR", scopeType: "state", office: "president" },
  "governor:pr": { scope: "PR", scopeType: "state", office: "governor" },
  "senator:pr": { scope: "PR", scopeType: "state", office: "senator" },
  "federal-deputy:pr": { scope: "PR", scopeType: "state", office: "federal-deputy" },
  "state-deputy:pr": { scope: "PR", scopeType: "state", office: "state-deputy" }
} as const satisfies Readonly<Record<string, ElectionResultIdentity>>;

export type PublicResultQueryErrorCode =
  | "UNKNOWN_PARAMETER"
  | "DUPLICATE_PARAMETER"
  | "INCOMPLETE_QUERY"
  | "UNSUPPORTED_COMBINATION";

export type PublicResultQuery =
  | { success: true; identity: ElectionResultIdentity; isDefault: boolean }
  | { success: false; code: PublicResultQueryErrorCode };

export function parsePublicResultQuery(searchParams: URLSearchParams): PublicResultQuery {
  for (const parameter of searchParams.keys()) {
    if (!ALLOWED_QUERY_PARAMETERS.has(parameter)) {
      return { success: false, code: "UNKNOWN_PARAMETER" };
    }
  }

  const offices = searchParams.getAll("office");
  const scopes = searchParams.getAll("scope");
  if (offices.length > 1 || scopes.length > 1) {
    return { success: false, code: "DUPLICATE_PARAMETER" };
  }

  if (offices.length === 0 && scopes.length === 0) {
    return { success: true, identity: { ...publicResultIdentities[DEFAULT_RESULT_KEY] }, isDefault: true };
  }
  if (offices.length !== 1 || scopes.length !== 1) {
    return { success: false, code: "INCOMPLETE_QUERY" };
  }

  const key = `${offices[0]}:${scopes[0]}`;
  const identity = publicResultIdentities[key as keyof typeof publicResultIdentities];
  if (!identity) {
    return { success: false, code: "UNSUPPORTED_COMBINATION" };
  }

  return { success: true, identity: { ...identity }, isDefault: key === DEFAULT_RESULT_KEY };
}
