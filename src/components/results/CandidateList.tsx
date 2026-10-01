import type { CandidateResult, CandidateStatus } from "@/lib/tse/types";
import { formatPercent, formatVotes } from "@/lib/ui/format";
import { Avatar } from "./Avatar";

const statusLabel: Partial<Record<CandidateStatus, string>> = {
  elected: "Eleito",
  "elected-by-quotient": "Eleito por QP",
  "elected-by-average": "Eleito por média",
  runoff: "2º turno",
  alternate: "Suplente"
};

function Row({ candidate, position, compact }: { candidate: CandidateResult; position: number; compact: boolean }) {
  const label = statusLabel[candidate.status];
  return (
    <li className={compact ? "row row--compact" : "row"}>
      <span className={position === 1 ? "rank rank-lead" : "rank"}>{position}</span>
      {!compact && <Avatar id={candidate.id} name={candidate.name} />}
      <div className="row-main">
        <span className="row-name">
          {candidate.name}
          {label && <span className="status-tag">{label}</span>}
        </span>
        {!compact && <span className="row-sub">{candidate.party}</span>}
        <div className="bar"><span style={{ width: `${candidate.percentage}%` }} /></div>
      </div>
      <div className="row-value">
        <strong>{formatPercent(candidate.percentage)}</strong>
        {!compact && <small>{formatVotes(candidate.votes)}</small>}
      </div>
    </li>
  );
}

type Props = { candidates: CandidateResult[]; limit: number; compact?: boolean; moreLabel?: string };

export function CandidateList({ candidates, limit, compact = false, moreLabel = "Ver todos os candidatos" }: Props) {
  if (candidates.length === 0) return <p className="muted">Nenhum candidato divulgado.</p>;
  const top = candidates.slice(0, limit);
  const rest = candidates.slice(limit);
  return (
    <>
      <ol className="rows">{top.map((c, i) => <Row key={c.id} candidate={c} position={i + 1} compact={compact} />)}</ol>
      {rest.length > 0 && (
        <details className="more">
          <summary>{moreLabel} ({candidates.length})</summary>
          <ol className="rows">{rest.map((c, i) => <Row key={c.id} candidate={c} position={limit + i + 1} compact={compact} />)}</ol>
        </details>
      )}
    </>
  );
}
