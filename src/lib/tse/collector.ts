import { z } from "zod";
import { getCache, type CacheStore } from "../cache";
import {
  createTseClient,
  TseFetchError,
  tseClientConfigFromEnv,
  type Ea20Scope,
  type TseClient,
  type TseFileRequest
} from "./client";
import { promoteLastKnownGood } from "./last-known-good";
import { appendUpdates, deriveUpdates, type UpdateItem } from "./updates";
import { normalizeEa12Catalog, promoteLocationCatalog, readLocationCatalog } from "./location-catalog";
import { collectMunicipalResults, type MunicipalCollectionReport } from "./municipal-results";
import { normalizeEa20, TseNormalizationError } from "./normalizer";
import { TsePayloadError } from "./parser";
import type { Ea11Payload, Ea12Payload, Ea20Payload } from "./schemas";
import type { ElectionOffice } from "./types";

const requiredFirstRoundStateOffices = ["3", "5", "6", "7"] as const;

export type CollectorConfig = {
  uf: string;
  round: "1" | "2";
  eventId?: string;
  // Time budget per municipal office; 0 disables municipal collection.
  municipalBudgetMs?: number;
};

export type DiscoveredElections = {
  eventId: string;
  cycle: string;
  round: "1" | "2";
  federalElectionId: string;
  stateElectionId: string;
};

export type CollectionItem = {
  office: ElectionOffice;
  scope: string;
  status: "promoted" | "unchanged" | "failed";
  sourceId?: string;
  errorCode?: string;
};

export type CollectionReport = {
  startedAt: string;
  finishedAt: string;
  discovery: DiscoveredElections;
  catalog: {
    status: "promoted" | "unchanged" | "failed";
    sourceId?: string;
    errorCode?: string;
  };
  items: CollectionItem[];
  municipal: MunicipalCollectionReport[];
};

export class TseCollectorError extends Error {
  readonly code: "INVALID_CONFIG" | "ELECTION_NOT_FOUND" | "AMBIGUOUS_ELECTION";

  constructor(code: TseCollectorError["code"], message: string) {
    super(message);
    this.name = "TseCollectorError";
    this.code = code;
  }
}

type ElectionEvent = Ea11Payload["pl"][number];
type Election = ElectionEvent["e"][number];

type CollectionTarget = {
  electionId: string;
  officeCode: string;
  office: ElectionOffice;
  scope: Ea20Scope;
  scopeLabel: string;
};

function officeCodes(election: Election): Set<string> {
  return new Set(election.abr.flatMap((scope) => scope.cp.map((office) => office.cd)));
}

function findFirstRoundElection(event: ElectionEvent, type: "1" | "8", requiredOffices: readonly string[]): Election | null {
  const matches = event.e.filter((election) => election.t === "1" && election.tp === type);
  const compatible = matches.filter((election) => {
    const available = officeCodes(election);
    return requiredOffices.every((office) => available.has(office));
  });
  return compatible.length === 1 ? compatible[0]! : null;
}

function electionIdForRound(election: Election, round: "1" | "2"): string | null {
  if (round === "1") return election.cd;
  return election.cdt2 && election.cdt2 !== "" ? election.cdt2 : null;
}

export function discoverElections(payload: Ea11Payload, config: CollectorConfig): DiscoveredElections {
  const requiredStateOffices = config.round === "1" ? requiredFirstRoundStateOffices : ["3"];
  const events = payload.pl
    .filter((event) => config.eventId === undefined || event.cd === config.eventId)
    .flatMap((event) => {
      const federal = findFirstRoundElection(event, "8", ["1"]);
      const state = findFirstRoundElection(event, "1", requiredStateOffices);
      if (!federal || !state) return [];

      const federalElectionId = electionIdForRound(federal, config.round);
      const stateElectionId = electionIdForRound(state, config.round);
      if (!federalElectionId || !stateElectionId) return [];

      return [{ event, federalElectionId, stateElectionId }];
    });

  if (events.length === 0) {
    throw new TseCollectorError("ELECTION_NOT_FOUND", "EA11 does not contain the configured election set");
  }
  if (events.length > 1) {
    throw new TseCollectorError("AMBIGUOUS_ELECTION", "More than one EA11 event matches the collector config");
  }

  const [{ event, federalElectionId, stateElectionId }] = events;
  return {
    eventId: event.cd,
    cycle: event.c,
    round: config.round,
    federalElectionId,
    stateElectionId
  };
}

function collectionTargets(discovery: DiscoveredElections, uf: string): CollectionTarget[] {
  const presidentTargets: CollectionTarget[] = [
    {
      electionId: discovery.federalElectionId,
      officeCode: "1",
      office: "president",
      scope: { type: "country" },
      scopeLabel: "BR"
    },
    {
      electionId: discovery.federalElectionId,
      officeCode: "1",
      office: "president",
      scope: { type: "state", uf },
      scopeLabel: uf.toUpperCase()
    }
  ];

  const stateTargets: CollectionTarget[] = [
    {
      electionId: discovery.stateElectionId,
      officeCode: "3",
      office: "governor",
      scope: { type: "state", uf },
      scopeLabel: uf.toUpperCase()
    }
  ];

  if (discovery.round === "1") {
    stateTargets.push(
      {
        electionId: discovery.stateElectionId,
        officeCode: "5",
        office: "senator",
        scope: { type: "state", uf },
        scopeLabel: uf.toUpperCase()
      },
      {
        electionId: discovery.stateElectionId,
        officeCode: "6",
        office: "federal-deputy",
        scope: { type: "state", uf },
        scopeLabel: uf.toUpperCase()
      },
      {
        electionId: discovery.stateElectionId,
        officeCode: "7",
        office: "state-deputy",
        scope: { type: "state", uf },
        scopeLabel: uf.toUpperCase()
      }
    );
  }

  return [...presidentTargets, ...stateTargets];
}

function errorCode(error: unknown): string {
  if (error instanceof TseFetchError) return `fetch:${error.code}`;
  if (error instanceof TsePayloadError) return `payload:${error.code}`;
  if (error instanceof TseNormalizationError) return `normalize:${error.code}`;
  if (error instanceof z.ZodError) return "cache:INVALID_RESULT";
  return "collector:UNEXPECTED";
}

export async function collectElectionResults(options: {
  client: TseClient;
  cache: CacheStore;
  config: CollectorConfig;
  now?: () => Date;
}): Promise<CollectionReport> {
  const now = options.now ?? (() => new Date());
  const startedAt = now().toISOString();
  const ea11 = await options.client.fetchPayload({ kind: "EA11" });
  const discovery = discoverElections(ea11, options.config);
  const items: CollectionItem[] = [];
  let catalog: CollectionReport["catalog"];

  try {
    const payload = (await options.client.fetchPayload({
      kind: "EA12",
      cycle: discovery.cycle,
      electionId: discovery.stateElectionId
    })) as Ea12Payload;
    const normalized = normalizeEa12Catalog(payload, discovery.stateElectionId);
    const promotion = await promoteLocationCatalog(options.cache, normalized, now);
    catalog = {
      status: promotion.promoted ? "promoted" : "unchanged",
      sourceId: promotion.snapshot.data.sourceId
    };
  } catch (error) {
    catalog = { status: "failed", errorCode: errorCode(error) };
  }

  const updates: UpdateItem[] = [];
  for (const target of collectionTargets(discovery, options.config.uf)) {
    try {
      const request: Extract<TseFileRequest, { kind: "EA20" }> = {
        kind: "EA20",
        cycle: discovery.cycle,
        electionId: target.electionId,
        officeCode: target.officeCode,
        scope: target.scope
      };
      const payload = (await options.client.fetchPayload(request)) as Ea20Payload;
      const results = normalizeEa20(payload);
      const result = results.find((candidate) => candidate.office === target.office);
      if (!result) {
        throw new TseNormalizationError("UNSUPPORTED_OFFICE", "EA20 did not normalize to the requested office");
      }

      const promotion = await promoteLastKnownGood(options.cache, result, now);
      if (promotion.promoted) updates.push(...deriveUpdates(promotion.previous?.data ?? null, promotion.snapshot.data));
      items.push({
        office: target.office,
        scope: target.scopeLabel,
        status: promotion.promoted ? "promoted" : "unchanged",
        sourceId: promotion.snapshot.data.sourceId
      });
    } catch (error) {
      items.push({ office: target.office, scope: target.scopeLabel, status: "failed", errorCode: errorCode(error) });
    }
  }

  try {
    await appendUpdates(options.cache, updates);
  } catch {
    // Updates are editorial extras; a failure here never affects results.
  }

  const municipal: MunicipalCollectionReport[] = [];
  const budgetMs = options.config.municipalBudgetMs ?? 0;
  if (budgetMs > 0) {
    const catalogSnapshot = await readLocationCatalog(options.cache);
    const state = catalogSnapshot?.data.states.find((item) => item.code === options.config.uf.toUpperCase());
    if (state) {
      const targets = [
        { office: "president", officeCode: "1", electionId: discovery.federalElectionId },
        { office: "governor", officeCode: "3", electionId: discovery.stateElectionId }
      ] as const;
      for (const target of targets) {
        municipal.push(
          await collectMunicipalResults({
            client: options.client,
            cache: options.cache,
            ...target,
            cycle: discovery.cycle,
            uf: options.config.uf,
            municipalities: state.municipalities,
            budgetMs,
            now
          })
        );
      }
    }
  }

  return { startedAt, finishedAt: now().toISOString(), discovery, catalog, items, municipal };
}

export function collectorConfigFromEnv(env: Readonly<Record<string, string | undefined>> = process.env): CollectorConfig {
  const uf = env.TSE_UF;
  const round = env.TSE_ROUND;
  const eventId = env.TSE_PLEITO_ID || undefined;

  if (!uf || !/^[a-z]{2}$/i.test(uf)) {
    throw new TseCollectorError("INVALID_CONFIG", "TSE_UF must contain a two-letter UF");
  }
  if (round !== "1" && round !== "2") {
    throw new TseCollectorError("INVALID_CONFIG", "TSE_ROUND must be 1 or 2");
  }
  if (eventId !== undefined && !/^\d{1,20}$/.test(eventId)) {
    throw new TseCollectorError("INVALID_CONFIG", "TSE_PLEITO_ID must be a numeric identifier");
  }

  const budget = env.TSE_MUNICIPAL_BUDGET_MS ?? "20000";
  if (!/^\d{1,6}$/.test(budget) || Number(budget) > 50_000) {
    throw new TseCollectorError("INVALID_CONFIG", "TSE_MUNICIPAL_BUDGET_MS must be between 0 and 50000");
  }

  return { uf: uf.toLowerCase(), round, eventId, municipalBudgetMs: Number(budget) };
}

export async function collectElectionResultsFromEnv(): Promise<CollectionReport> {
  const client = createTseClient(tseClientConfigFromEnv());
  const cache = await getCache();
  return collectElectionResults({ client, cache, config: collectorConfigFromEnv() });
}
