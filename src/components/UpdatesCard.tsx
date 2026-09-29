import type { UpdateItem } from "@/lib/tse/updates";

const timeFormat = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
const VISIBLE = 5;

function Item({ item }: { item: UpdateItem }) {
  return (
    <li>
      <time dateTime={item.at}>{timeFormat.format(new Date(item.at))}</time>
      <span>{item.text}</span>
    </li>
  );
}

export function UpdatesCard({ items }: { items: UpdateItem[] }) {
  const rest = items.slice(VISIBLE);
  return (
    <article className="card card--updates">
      <h2>Últimas atualizações</h2>
      {items.length === 0 ? (
        <p className="muted">As atualizações aparecem aqui assim que a apuração começar.</p>
      ) : (
        <>
          <ul className="updates">{items.slice(0, VISIBLE).map((item) => <Item key={item.id} item={item} />)}</ul>
          {rest.length > 0 && (
            <details className="more">
              <summary>Ver todas as atualizações ({items.length})</summary>
              <ul className="updates">{rest.map((item) => <Item key={item.id} item={item} />)}</ul>
            </details>
          )}
        </>
      )}
    </article>
  );
}
