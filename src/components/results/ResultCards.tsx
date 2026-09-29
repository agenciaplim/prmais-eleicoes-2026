import type { LoadedPublicResult } from "@/lib/tse/public-result-loader";
import type { ElectionResult } from "@/lib/tse/types";
import { formatInteger, formatPercent } from "@/lib/ui/format";
import { CandidateList } from "./CandidateList";
import { PartyList } from "./PartyList";

function Waiting() {
  return <p className="waiting">Aguardando dados do TSE.</p>;
}

function Progress({ result }: { result: ElectionResult }) {
  return (
    <div className="card-progress">
      <span><strong>{formatPercent(result.progress)}</strong> das seções apuradas</span>
      <div className="bar bar--progress"><span style={{ width: `${result.progress}%` }} /></div>
    </div>
  );
}

type PresidentProps = { loaded: LoadedPublicResult; subtitle: string; limit: number };

export function PresidentCard({ loaded, subtitle, limit }: PresidentProps) {
  return (
    <article className="card">
      <header className="card-head">
        <div>
          <h2>Presidente</h2>
          <p className="muted">{subtitle}</p>
        </div>
        {loaded.source !== "unavailable" && <Progress result={loaded.data} />}
      </header>
      {loaded.source === "unavailable" ? <Waiting /> : <CandidateList candidates={loaded.data.candidates} limit={limit} />}
    </article>
  );
}

type OfficeProps = { title: string; loaded: LoadedPublicResult; limit?: number };

export function OfficeCard({ title, loaded, limit = 3 }: OfficeProps) {
  const result = loaded.source === "unavailable" ? null : loaded.data;
  return (
    <article className="card card--compact">
      <h3>{title}</h3>
      {!result ? (
        <Waiting />
      ) : result.groups.length > 0 ? (
        <PartyList groups={result.groups} limit={limit} />
      ) : (
        <CandidateList candidates={result.candidates} limit={limit} compact />
      )}
    </article>
  );
}

export function TurnoutCard({ loaded }: { loaded: LoadedPublicResult }) {
  if (loaded.source === "unavailable") {
    return <article className="card"><h2>Participação no Brasil</h2><Waiting /></article>;
  }
  const { electorate, votes } = loaded.data;
  const share = (value: number, total: number) => (total > 0 ? formatPercent((value / total) * 100) : "—");
  const items = [
    ["Comparecimento", electorate.attendance, share(electorate.attendance, electorate.totalized)],
    ["Abstenção", electorate.abstention, share(electorate.abstention, electorate.totalized)],
    ["Votos válidos", votes.valid ?? votes.candidateVotes, share(votes.valid ?? votes.candidateVotes, votes.total)],
    ["Brancos", votes.blank, share(votes.blank, votes.total)],
    ["Nulos", votes.nullVotes, share(votes.nullVotes, votes.total)]
  ] as const;

  return (
    <article className="card">
      <h2>Participação no Brasil</h2>
      <dl className="stats">
        {items.map(([label, value, percent]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd><strong>{percent}</strong><small>{formatInteger(value)}</small></dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
