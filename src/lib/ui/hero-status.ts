// Pure helpers shared by the server page and the client hero. No server-only imports here.

export type HeroResult = {
  status: "not-started" | "in-progress" | "finished";
  phase: "simulation" | "official";
  final: boolean;
  progress: number;
  updatedAt: string;
};

export type HeroSource = "cache" | "mock" | "unavailable";

export type HeroStatus = {
  state: "live" | "finished" | "not-started" | "unavailable";
  badge: string;
  updatedText: string | null;
  progressText: string | null;
  note: string | null;
};

const TIME_ZONE = "America/Sao_Paulo";
const timeFormat = new Intl.DateTimeFormat("pt-BR", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit" });
const dayFormat = new Intl.DateTimeFormat("pt-BR", { timeZone: TIME_ZONE, day: "2-digit", month: "2-digit" });
const percentFormat = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Validates the subset of /api/results the hero needs; anything else keeps the previous state.
export function parseHeroResult(input: unknown): HeroResult | null {
  if (!input || typeof input !== "object") return null;
  const value = input as Record<string, unknown>;
  const statusOk = value.status === "not-started" || value.status === "in-progress" || value.status === "finished";
  const phaseOk = value.phase === "simulation" || value.phase === "official";
  const progressOk = typeof value.progress === "number" && Number.isFinite(value.progress) && value.progress >= 0 && value.progress <= 100;
  const updatedOk = typeof value.updatedAt === "string" && !Number.isNaN(Date.parse(value.updatedAt));
  if (!statusOk || !phaseOk || !progressOk || !updatedOk || typeof value.final !== "boolean") return null;
  return {
    status: value.status as HeroResult["status"],
    phase: value.phase as HeroResult["phase"],
    final: value.final,
    progress: value.progress as number,
    updatedAt: value.updatedAt as string
  };
}

function formatUpdated(updatedAt: string, now: Date): string {
  const date = new Date(updatedAt);
  const time = timeFormat.format(date);
  return dayFormat.format(date) === dayFormat.format(now) ? `Atualizado às ${time}` : `Atualizado em ${dayFormat.format(date)} às ${time}`;
}

export function buildHeroStatus(source: HeroSource, result: HeroResult | null, now: Date = new Date()): HeroStatus {
  if (source === "unavailable" || !result) {
    return { state: "unavailable", badge: "Aguardando dados", updatedText: null, progressText: null, note: "Os resultados aparecem assim que o TSE iniciar a divulgação." };
  }

  const progressText = `${percentFormat.format(result.progress)}% das seções apuradas`;
  const note =
    source === "mock"
      ? "Dados demonstrativos enquanto a integração TSE não estiver ativa."
      : result.phase === "simulation"
        ? "Dados do ambiente de simulação do TSE."
        : null;
  const updatedText = source === "mock" ? null : formatUpdated(result.updatedAt, now);

  if (result.final || result.status === "finished") {
    return { state: "finished", badge: "Apuração encerrada", updatedText, progressText, note };
  }
  if (result.status === "not-started") {
    return { state: "not-started", badge: "Aguardando início", updatedText, progressText: null, note };
  }
  return { state: "live", badge: "Apuração ao vivo", updatedText, progressText, note };
}
