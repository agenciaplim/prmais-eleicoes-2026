import type { Ea20Payload } from "./schemas";
import type {
  CandidateResult,
  CandidateStatus,
  ElectionOffice,
  ElectionPhase,
  ElectionResult,
  ElectionScopeType,
  ElectionStatus,
  PartyGroupResult,
  PartyGroupType,
  TicketRole,
  VoteDestination
} from "./types";

const BRASILIA_OFFSET = "-03:00";

const officeByCode = {
  "1": "president",
  "3": "governor",
  "5": "senator",
  "6": "federal-deputy",
  "7": "state-deputy"
} as const satisfies Record<string, ElectionOffice>;

const scopeTypeByTse = {
  br: "country",
  uf: "state",
  mu: "municipality",
  zona: "electoral-zone"
} as const satisfies Record<Ea20Payload["tpabr"], ElectionScopeType>;

const statusByTse = {
  n: "not-started",
  p: "in-progress",
  f: "finished"
} as const satisfies Record<Ea20Payload["and"], ElectionStatus>;

const candidateStatusByTse = {
  "": "pending",
  Eleito: "elected",
  "Eleito por QP": "elected-by-quotient",
  "Eleito por média": "elected-by-average",
  "Não eleito": "not-elected",
  "2º turno": "runoff",
  Suplente: "alternate"
} as const satisfies Record<string, CandidateStatus>;

const destinationByTse = {
  "": "pending",
  Válido: "valid",
  "Válido (legenda)": "party-list",
  Anulado: "annulled",
  "Anulado sub judice": "annulled-sub-judice"
} as const satisfies Record<string, VoteDestination>;

const ticketRoleByTse = {
  v: "vice",
  s1: "first-alternate",
  s2: "second-alternate"
} as const satisfies Record<string, TicketRole>;

export class TseNormalizationError extends Error {
  readonly code: "UNSUPPORTED_PAYLOAD" | "UNSUPPORTED_OFFICE";

  constructor(code: TseNormalizationError["code"], message: string) {
    super(message);
    this.name = "TseNormalizationError";
    this.code = code;
  }
}

function toNumber(value: string): number {
  return Number(value);
}

function toPercentage(value: string): number {
  return Number(value.replace(",", "."));
}

function toTimestamp(date: string, time: string): string {
  const [day, month, year] = date.split("/");
  return `${year}-${month}-${day}T${time}${BRASILIA_OFFSET}`;
}

function normalizeCandidate(
  candidate: NonNullable<NonNullable<Ea20Payload["carg"]>[number]["agr"][number]["par"][number]["cand"]>[number],
  party: NonNullable<Ea20Payload["carg"]>[number]["agr"][number]["par"][number]
): CandidateResult {
  return {
    id: candidate.sqcand,
    number: candidate.n,
    name: candidate.nmu,
    fullName: candidate.nm,
    party: party.sg,
    partyName: party.nm,
    votes: toNumber(candidate.vap),
    percentage: toPercentage(candidate.pvapn),
    rank: toNumber(candidate.seq),
    elected: candidate.e === "s",
    status: candidateStatusByTse[candidate.st],
    destination: destinationByTse[candidate.dvt],
    runningMates: (candidate.vs ?? []).map((member) => ({
      id: member.sqcand,
      name: member.nmu,
      fullName: member.nm,
      party: member.sgp,
      role: ticketRoleByTse[member.tp]
    })),
    substitutes: (candidate.subs ?? []).map((substitute) => ({
      name: substitute.nmu,
      fullName: substitute.nm,
      party: substitute.sgp
    }))
  };
}

type Ea20Office = NonNullable<Ea20Payload["carg"]>[number];

const groupTypeByTse = { f: "federation", i: "party", c: "coalition" } as const satisfies Record<string, PartyGroupType>;

// Group totals come from the TSE (tvtn nominal + tvtl party-list); percentages use valid votes.
function normalizeGroups(office: Ea20Office, validVotes: number | null): PartyGroupResult[] {
  const groups = office.agr.map((group) => {
    // Group totals are optional in EA20; when absent, sum the parties (tvtn is mandatory per party).
    const nominalVotes = group.tvtn !== undefined ? toNumber(group.tvtn) : group.par.reduce((sum, party) => sum + toNumber(party.tvtn), 0);
    const partyListVotes =
      group.tvtl !== undefined ? toNumber(group.tvtl) : group.par.reduce((sum, party) => sum + toNumber(party.tvtl ?? "0"), 0);
    const federation = office.fed.find((item) => item.n === group.n);
    const acronym = group.tp === "f" ? federation?.sg ?? group.nm : group.tp === "i" ? group.par[0]!.sg : group.nm;
    return {
      id: group.n,
      type: groupTypeByTse[group.tp],
      acronym,
      name: federation?.nm ?? (group.tp === "i" ? group.par[0]!.nm : group.nm),
      parties: group.par.map((party) => party.sg),
      votes: nominalVotes + partyListVotes,
      nominalVotes,
      partyListVotes,
      percentage: 0,
      seats: group.vag === undefined ? null : toNumber(group.vag)
    };
  });

  const total = validVotes ?? groups.reduce((sum, group) => sum + group.votes, 0);
  return groups
    .map((group) => ({ ...group, percentage: total > 0 ? Math.min(100, (group.votes / total) * 100) : 0 }))
    .sort((left, right) => right.votes - left.votes || left.acronym.localeCompare(right.acronym));
}

function officeForCode(code: string): ElectionOffice {
  const office = officeByCode[code as keyof typeof officeByCode];
  if (!office) {
    throw new TseNormalizationError("UNSUPPORTED_OFFICE", `Unsupported TSE office code: ${code}`);
  }
  return office;
}

export function normalizeEa20(payload: Ea20Payload): ElectionResult[] {
  if (!payload.carg) {
    throw new TseNormalizationError("UNSUPPORTED_PAYLOAD", "EA20 consultation payloads are not supported");
  }

  const generatedAt = toTimestamp(payload.dg, payload.hg);
  const updatedAt = payload.dt && payload.ht ? toTimestamp(payload.dt, payload.ht) : generatedAt;

  return payload.carg.map((office) => {
    const candidates = office.agr
      .flatMap((group) => group.par)
      .flatMap((party) => (party.cand ?? []).map((candidate) => normalizeCandidate(candidate, party)))
      // Votes first: the simulation publishes `seq` out of vote order; `seq` only breaks ties.
      .sort((left, right) => right.votes - left.votes || left.rank - right.rank);
    const validVotes = payload.v.vv === undefined ? null : toNumber(payload.v.vv);
    const proportional = office.qe !== undefined;

    return {
      sourceId: payload.idg,
      electionId: payload.ele,
      round: toNumber(payload.t) as 1 | 2,
      phase: (payload.f === "s" ? "simulation" : "official") satisfies ElectionPhase,
      scope: payload.cdabr.toUpperCase(),
      scopeType: scopeTypeByTse[payload.tpabr],
      office: officeForCode(office.cd),
      officeCode: office.cd,
      officeName: office.nmn,
      seats: toNumber(office.nv),
      electoralQuotient: office.qe === undefined ? null : toNumber(office.qe),
      generatedAt,
      updatedAt,
      status: statusByTse[payload.and],
      final: payload.tf === "s",
      progress: toPercentage(payload.s.pstn),
      sections: {
        total: toNumber(payload.s.ts),
        totalized: toNumber(payload.s.st),
        pending: toNumber(payload.s.snt)
      },
      electorate: {
        eligible: toNumber(payload.e.te),
        totalized: toNumber(payload.e.est),
        attendance: toNumber(payload.e.c),
        abstention: toNumber(payload.e.a)
      },
      votes: {
        total: toNumber(payload.v.tv),
        candidateVotes: toNumber(payload.v.vvc),
        valid: payload.v.vv === undefined ? null : toNumber(payload.v.vv),
        nominal: payload.v.vnom === undefined ? null : toNumber(payload.v.vnom),
        partyList: payload.v.vl === undefined ? null : toNumber(payload.v.vl),
        annulled: payload.v.van === undefined ? null : toNumber(payload.v.van),
        annulledSubJudice: payload.v.vansj === undefined ? null : toNumber(payload.v.vansj),
        blank: toNumber(payload.v.vb),
        nullVotes: toNumber(payload.v.tvn),
        regularNull: payload.v.vn === undefined ? null : toNumber(payload.v.vn),
        technicalNull: toNumber(payload.v.vnt),
        canceledWithoutValidity: toNumber(payload.v.vscv),
        withoutAnnulment: toNumber(payload.v.vsan)
      },
      candidates,
      groups: proportional ? normalizeGroups(office, validVotes) : []
    };
  });
}
