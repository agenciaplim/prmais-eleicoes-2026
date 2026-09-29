import { AutoRefresh } from "@/components/AutoRefresh";
import { Hero } from "@/components/Hero";
import { OfficeCard, PresidentCard, TurnoutCard } from "@/components/results/ResultCards";
import { ResultTabs } from "@/components/ResultTabs";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { loadHomeResults } from "@/lib/tse/home-results";
import { buildHeroStatus } from "@/lib/ui/hero-status";

// Re-render at most every 15s from our cache; AutoRefresh pulls new renders every 30s.
export const revalidate = 15;

function MapPlaceholder() {
  return (
    <article className="card">
      <h2>Mapa do Paraná</h2>
      <p className="muted">Clique em um município para ver os resultados locais.</p>
      <div className="placeholder">Mapa interativo dos 399 municípios</div>
    </article>
  );
}

export default async function Home() {
  const results = await loadHomeResults();
  const presidentBr = results.presidentBr;
  const hero = buildHeroStatus(presidentBr.source, presidentBr.source === "unavailable" ? null : presidentBr.data);

  const stateOffices = (
    <section className="card state-block" aria-labelledby="parana-title">
      <h2 id="parana-title">Paraná <span className="muted">Resultados estaduais</span></h2>
      <div className="office-grid">
        <OfficeCard title="Governador" loaded={results.governor} />
        <OfficeCard title="Senado" loaded={results.senator} />
        <OfficeCard title="Deputado Federal" loaded={results.federalDeputy} />
        <OfficeCard title="Deputado Estadual" loaded={results.stateDeputy} />
      </div>
    </section>
  );

  const panels = [
    {
      id: "parana",
      label: "Paraná",
      content: (
        <>
          <PresidentCard loaded={presidentBr} subtitle="Resultados nacionais" limit={5} />
          {stateOffices}
          <MapPlaceholder />
        </>
      )
    },
    {
      id: "presidente",
      label: "Presidente",
      content: (
        <>
          <PresidentCard loaded={presidentBr} subtitle="Resultados nacionais" limit={20} />
          <PresidentCard loaded={results.presidentPr} subtitle="Votação no Paraná" limit={20} />
        </>
      )
    },
    {
      id: "brasil",
      label: "Brasil",
      content: (
        <>
          <PresidentCard loaded={presidentBr} subtitle="Resultados nacionais" limit={5} />
          <TurnoutCard loaded={presidentBr} />
        </>
      )
    },
    {
      id: "municipios",
      label: "Municípios",
      content: <MapPlaceholder />
    }
  ];

  return (
    <>
      <SiteHeader />
      <AutoRefresh />

      <main className="shell">
        <Hero status={hero} />

        <div className="grid">
          <section>
            <ResultTabs panels={panels} />
          </section>

          <aside>
            <article className="card">
              <h2>Cobertura ao vivo</h2>
              <div className="placeholder">Embed configurável da transmissão</div>
            </article>
            <article className="card"><h2>Últimas atualizações</h2><p className="muted">Aguardando integração TSE.</p></article>
            <article className="card">
              <h2>Buscar município</h2>
              <input aria-label="Buscar município" placeholder="Digite o nome do município..." />
            </article>
          </aside>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
