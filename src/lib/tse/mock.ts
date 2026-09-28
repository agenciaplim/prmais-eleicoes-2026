import type { ElectionResult } from "./types";

export const mockResult: ElectionResult = {
  scope: "BR",
  office: "president",
  updatedAt: new Date(0).toISOString(),
  progress: 58.42,
  candidates: [
    { number: "00", name: "Candidato A", party: "XX", votes: 32548921, percentage: 42.18 },
    { number: "00", name: "Candidato B", party: "YY", votes: 28341112, percentage: 36.73 },
    { number: "00", name: "Candidato C", party: "ZZ", votes: 9582331, percentage: 12.41 }
  ]
};
