export type CandidateResult = {
  number: string;
  name: string;
  party: string;
  votes: number;
  percentage: number;
};

export type ElectionResult = {
  scope: string;
  office: string;
  updatedAt: string;
  progress: number;
  candidates: CandidateResult[];
};
