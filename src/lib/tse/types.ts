export type ElectionOffice =
  | "president"
  | "governor"
  | "senator"
  | "federal-deputy"
  | "state-deputy";

export type ElectionScopeType = "country" | "state" | "municipality" | "electoral-zone";
export type ElectionStatus = "not-started" | "in-progress" | "finished";
export type ElectionPhase = "simulation" | "official";
export type CandidateStatus =
  | "pending"
  | "elected"
  | "elected-by-quotient"
  | "elected-by-average"
  | "not-elected"
  | "runoff"
  | "alternate";
export type VoteDestination = "pending" | "valid" | "party-list" | "annulled" | "annulled-sub-judice";
export type TicketRole = "vice" | "first-alternate" | "second-alternate";

export type TicketMember = {
  id: string;
  name: string;
  fullName: string;
  party: string;
  role: TicketRole;
};

export type Substitute = {
  name: string;
  fullName: string;
  party: string;
};

export type CandidateResult = {
  id: string;
  number: string;
  name: string;
  fullName: string;
  party: string;
  partyName: string;
  votes: number;
  percentage: number;
  rank: number;
  elected: boolean;
  status: CandidateStatus;
  destination: VoteDestination;
  runningMates: TicketMember[];
  substitutes: Substitute[];
};

export type PartyGroupType = "federation" | "party" | "coalition";

// Proportional offices only: vote totals per federation or isolated party.
export type PartyGroupResult = {
  id: string;
  type: PartyGroupType;
  acronym: string;
  name: string;
  parties: string[];
  votes: number;
  nominalVotes: number;
  partyListVotes: number;
  percentage: number;
  seats: number | null;
};

export type SectionTotals = {
  total: number;
  totalized: number;
  pending: number;
};

export type ElectorateTotals = {
  eligible: number;
  totalized: number;
  attendance: number;
  abstention: number;
};

export type VoteTotals = {
  total: number;
  candidateVotes: number;
  valid: number | null;
  nominal: number | null;
  partyList: number | null;
  annulled: number | null;
  annulledSubJudice: number | null;
  blank: number;
  nullVotes: number;
  regularNull: number | null;
  technicalNull: number;
  canceledWithoutValidity: number;
  withoutAnnulment: number;
};

export type ElectionResult = {
  sourceId: string;
  electionId: string;
  round: 1 | 2;
  phase: ElectionPhase;
  scope: string;
  scopeType: ElectionScopeType;
  office: ElectionOffice;
  officeCode: string;
  officeName: string;
  seats: number;
  electoralQuotient: number | null;
  generatedAt: string;
  updatedAt: string;
  status: ElectionStatus;
  final: boolean;
  progress: number;
  sections: SectionTotals;
  electorate: ElectorateTotals;
  votes: VoteTotals;
  candidates: CandidateResult[];
  groups: PartyGroupResult[];
};
