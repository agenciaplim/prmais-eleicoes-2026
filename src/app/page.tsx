import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { LiveHero } from "@/components/LiveHero";
import { loadPublicResult } from "@/lib/tse/public-result-loader";
import { buildHeroStatus, type HeroStatus } from "@/lib/ui/hero-status";

// Re-render at most every 15s from our cache; the client hero polls between renders.
export const revalidate = 15;

async function loadHeroStatus(): Promise<HeroStatus> {
  try {
    const result = await loadPublicResult({ scope: "BR", scopeType: "country", office: "president" }, true);
    return buildHeroStatus(result.source, result.source === "unavailable" ? null : result.data);
  } catch {
    // Cache unreachable or misconfigured: render the page without results instead of failing.
    return buildHeroStatus("unavailable", null);
  }
}

const candidates = [
  ["Candidato A", 42.18],
  ["Candidato B", 36.73],
  ["Candidato C", 12.41]
] as const;

const percent = (value: number) => `${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}%`;

export default async function Home() {
  const hero = await loadHeroStatus();

  return (
    <>
      <SiteHeader />

      <main className="shell">
        <LiveHero initial={hero} />

        <nav className="tabs" aria-label="Filtros de resultados">
          <button aria-pressed="true">Paraná</button>
          <button aria-pressed="false">Presidente</button>
          <button aria-pressed="false">Brasil</button>
          <button aria-pressed="false">Municípios</button>
        </nav>

        <div className="grid">
          <section>
            <article className="card">
              <h2>Presidente</h2>
              <p className="muted">Resultados nacionais</p>
              {candidates.map(([name, value], index) => (
                <div className="candidate" key={name}>
                  <strong className={index === 0 ? "rank rank-lead" : "rank"}>{index + 1}</strong>
                  <div>
                    <span>{name}</span>
                    <div className="bar"><span style={{ width: `${value}%` }} /></div>
                  </div>
                  <strong className="value">{percent(value)}</strong>
                </div>
              ))}
            </article>

            <section className="mini-grid">
              {["Governador", "Senado", "Deputado Federal", "Deputado Estadual"].map((title) => (
                <article className="card" key={title}><h3>{title}</h3><div className="placeholder">Resultados</div></article>
              ))}
            </section>

            <article className="card">
              <h2>Mapa do Paraná</h2>
              <div className="placeholder">Mapa interativo dos 399 municípios</div>
            </article>
          </section>

          <aside>
            <article className="card">
              <h2>Cobertura ao vivo</h2>
              <div className="placeholder">Embed configurável da transmissão</div>
            </article>
            <article className="card"><h2>Últimas atualizações</h2><p className="muted">Aguardando integração TSE.</p></article>
            <article className="card">
              <h2>Buscar município</h2>
              <input aria-label="Buscar município" placeholder="Digite o município..." />
            </article>
          </aside>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
