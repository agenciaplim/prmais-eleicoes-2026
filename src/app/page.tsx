const candidates = [
  ["Candidato A", "42,18%"],
  ["Candidato B", "36,73%"],
  ["Candidato C", "12,41%"]
];

export default function Home() {
  return (
    <main className="shell">
      <header className="header">
        <div className="brand">PR+</div>
        <div>Eleicoes 2026</div>
      </header>

      <section className="hero">
        <div>
          <h1>Eleicoes 2026</h1>
          <p>Acompanhe os resultados em tempo real.</p>
        </div>
        <div>
          <div className="live">● APURACAO AO VIVO</div>
          <p>58,42% das secoes apuradas</p>
          <small>Dados demonstrativos enquanto a integracao TSE nao estiver ativa.</small>
        </div>
      </section>

      <nav className="tabs" aria-label="Filtros de resultados">
        <button>Parana</button><button>Presidente</button><button>Brasil</button><button>Municipios</button>
      </nav>

      <div className="grid">
        <section>
          <article className="card">
            <h2>Presidente</h2>
            <p>Resultados nacionais</p>
            {candidates.map(([name, value], index) => (
              <div className="candidate" key={name}>
                <strong>{index + 1}</strong><span>{name}</span><strong>{value}</strong>
              </div>
            ))}
          </article>

          <section className="mini-grid">
            {['Governador', 'Senado', 'Deputado Federal', 'Deputado Estadual'].map((title) => (
              <article className="card" key={title}><h3>{title}</h3><div className="placeholder">Resultados</div></article>
            ))}
          </section>

          <article className="card">
            <h2>Mapa do Parana</h2>
            <div className="placeholder">Mapa interativo dos 399 municipios</div>
          </article>
        </section>

        <aside>
          <article className="card">
            <h2>Cobertura ao vivo</h2>
            <div className="placeholder">Embed configuravel da transmissao</div>
          </article>
          <article className="card"><h2>Ultimas atualizacoes</h2><p>Aguardando integracao TSE.</p></article>
          <article className="card"><h2>Buscar municipio</h2><input aria-label="Buscar municipio" placeholder="Digite o municipio..." /></article>
        </aside>
      </div>

      <footer>Fonte: TSE | PR+ Eleicoes 2026</footer>
    </main>
  );
}
