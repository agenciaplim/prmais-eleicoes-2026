import { municipalOffices, type MunicipalEntry, type MunicipalOffice, type MunicipalSummary } from "./municipal-results";

export type PublicMunicipalQuery =
  | { success: true; office: MunicipalOffice; code: string | null }
  | { success: false; code: "UNKNOWN_PARAMETER" | "DUPLICATE_PARAMETER" | "INVALID_OFFICE" | "INVALID_CODE" };

const ALLOWED = new Set(["office", "code"]);

export function parsePublicMunicipalQuery(params: URLSearchParams): PublicMunicipalQuery {
  for (const key of params.keys()) if (!ALLOWED.has(key)) return { success: false, code: "UNKNOWN_PARAMETER" };
  if (params.getAll("office").length > 1 || params.getAll("code").length > 1) return { success: false, code: "DUPLICATE_PARAMETER" };

  const office = params.get("office");
  if (!office || !(municipalOffices as readonly string[]).includes(office)) return { success: false, code: "INVALID_OFFICE" };
  const code = params.get("code");
  if (code !== null && !/^\d{5}$/.test(code)) return { success: false, code: "INVALID_CODE" };
  return { success: true, office: office as MunicipalOffice, code };
}

export type MunicipalOverviewItem = {
  tseCode: string;
  ibgeCode: string;
  name: string;
  progress: number;
  leader: { name: string; party: string; percentage: number } | null;
};

// Light list for the map: one leader per municipality.
export function municipalOverview(summary: MunicipalSummary): MunicipalOverviewItem[] {
  return Object.values(summary.entries)
    .map((entry) => {
      const leader = entry.candidates[0];
      return {
        tseCode: entry.tseCode,
        ibgeCode: entry.ibgeCode,
        name: entry.name,
        progress: entry.progress,
        leader: leader && leader.votes > 0 ? { name: leader.name, party: leader.party, percentage: leader.percentage } : null
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export function municipalEntry(summary: MunicipalSummary, code: string): MunicipalEntry | null {
  return summary.entries[code] ?? null;
}
