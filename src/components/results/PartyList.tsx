import type { PartyGroupResult } from "@/lib/tse/types";
import { formatPercent, formatVotes } from "@/lib/ui/format";

function Row({ group, rank }: { group: PartyGroupResult; rank: number }) {
  return (
    <li className="row row--compact" title={group.name}>
      <span className={rank === 1 ? "rank rank-lead" : "rank"}>{rank}</span>
      <div className="row-main">
        <span className="row-name">
          {group.acronym}
          {group.seats ? <span className="status-tag">{group.seats} {group.seats === 1 ? "vaga" : "vagas"}</span> : null}
        </span>
        <div className="bar"><span style={{ width: `${group.percentage}%` }} /></div>
      </div>
      <div className="row-value">
        <strong>{formatPercent(group.percentage)}</strong>
        <small className="sr-only">{formatVotes(group.votes)}</small>
      </div>
    </li>
  );
}

export function PartyList({ groups, limit }: { groups: PartyGroupResult[]; limit: number }) {
  if (groups.length === 0) return <p className="muted">Nenhum partido divulgado.</p>;
  const rest = groups.slice(limit);
  return (
    <>
      <ol className="rows">{groups.slice(0, limit).map((g, i) => <Row key={g.id} group={g} rank={i + 1} />)}</ol>
      {rest.length > 0 && (
        <details className="more">
          <summary>Ver todos os partidos ({groups.length})</summary>
          <ol className="rows">{rest.map((g, i) => <Row key={g.id} group={g} rank={limit + i + 1} />)}</ol>
        </details>
      )}
    </>
  );
}
