// Pure helpers for the municipality search (client-side). Responses from our API are
// checked before use; anything unexpected is treated as unavailable.

export type MunicipalityOption = { tseCode: string; ibgeCode: string; name: string };
export type MunicipalCandidate = { number: string; name: string; party: string; votes: number; percentage: number; elected: boolean };
export type MunicipalDetail = { tseCode: string; name: string; progress: number; updatedAt: string; candidates: MunicipalCandidate[] };

export const FEATURED_MUNICIPALITIES = ["CURITIBA", "LONDRINA", "MARINGÁ", "CASCAVEL", "PONTA GROSSA"];

export const normalizeName = (value: string) =>
  value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export function filterMunicipalities(options: MunicipalityOption[], query: string, limit = 8): MunicipalityOption[] {
  const term = normalizeName(query);
  if (!term) return [];
  const starts: MunicipalityOption[] = [];
  const contains: MunicipalityOption[] = [];
  for (const option of options) {
    const name = normalizeName(option.name);
    if (name.startsWith(term)) starts.push(option);
    else if (name.includes(term)) contains.push(option);
  }
  return [...starts, ...contains].slice(0, limit);
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

export function parseLocationOptions(input: unknown): MunicipalityOption[] {
  if (!isRecord(input) || !isRecord(input.state) || !Array.isArray(input.state.municipalities)) return [];
  return input.state.municipalities.flatMap((item: unknown) =>
    isRecord(item) && typeof item.tseCode === "string" && /^\d{5}$/.test(item.tseCode) && typeof item.name === "string" && typeof item.ibgeCode === "string"
      ? [{ tseCode: item.tseCode, ibgeCode: item.ibgeCode, name: item.name }]
      : []
  );
}

export function parseMunicipalDetail(input: unknown): MunicipalDetail | null {
  if (!isRecord(input) || typeof input.tseCode !== "string" || typeof input.name !== "string") return null;
  if (typeof input.progress !== "number" || typeof input.updatedAt !== "string" || !Array.isArray(input.candidates)) return null;
  const candidates = input.candidates.flatMap((item: unknown) =>
    isRecord(item) &&
    typeof item.name === "string" &&
    typeof item.party === "string" &&
    typeof item.number === "string" &&
    typeof item.votes === "number" &&
    typeof item.percentage === "number" &&
    typeof item.elected === "boolean"
      ? [{ number: item.number, name: item.name, party: item.party, votes: item.votes, percentage: item.percentage, elected: item.elected }]
      : []
  );
  return { tseCode: input.tseCode, name: input.name, progress: input.progress, updatedAt: input.updatedAt, candidates };
}
