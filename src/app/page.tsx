import { BrandLogo } from "@/components/BrandLogo";

const candidates = [
  ["Candidato A", 42.18],
  ["Candidato B", 36.73],
  ["Candidato C", 12.41]
] as const;

const percent = (value: number) => `${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}%`;

export default function Home() {
  return (
    <>
      <header className="header">
        <div className="shell header-inner">
          <a href="/" aria-label="PR Mais — início">
            <BrandLogo height={40} priority />
          </a>
          <span className="tag">Eleições 2026</span>
        </div>
      </header>

      <main className="shell">
        <section className="hero">
          <div>
            <p className="kicker">Central de apuração</p>
            <h1>Eleições 2026</h1>
            <p>Acompanhe os resultados em tempo real.</p>
          </div>
          <div className="hero-status">
            <div className="live"><span className="live-dot" aria-hidden="true" />Apuração ao vivo</div>
            <div className="progress" role="progressbar" aria-valuenow={58.42} aria-valuemin={0} aria-valuemax={100} aria-label="Seções apuradas">
              <span style={{ width: "58.42%" }} />
            </div>
            <p><strong>58,42%</strong> das seções apuradas</p>
            <small>Dados demonstrativos enquanto a integração TSE não estiver ativa.</small>
          </div>
        </section>

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

      <footer className="footer">
        <div className="shell footer-inner">
          <BrandLogo variant="bege" height={32} />
          <span>Fonte: TSE · PR+ Eleições 2026</span>
        </div>
      </footer>
    </>
  );
}
