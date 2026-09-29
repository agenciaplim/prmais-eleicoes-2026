import { AutoRefresh } from "@/components/AutoRefresh";
import { Hero } from "@/components/Hero";
import { LiveCoverage, TvMode } from "@/components/LiveBlocks";
import { MunicipalitySearch } from "@/components/MunicipalitySearch";
import { PrMap } from "@/components/PrMap";
import { OfficeCard, PresidentCard, TurnoutCard } from "@/components/results/ResultCards";
import { ResultTabs } from "@/components/ResultTabs";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { UpdatesCard } from "@/components/UpdatesCard";
import { getCache } from "@/lib/cache";
import { liveEmbed } from "@/lib/live";
import { loadHomeResults } from "@/lib/tse/home-results";
import { readUpdates, type UpdateItem } from "@/lib/tse/updates";
import { buildHeroStatus } from "@/lib/ui/hero-status";

// Re-render at most every 15s from our cache; AutoRefresh pulls new renders every 30s.
export const revalidate = 15;

async function loadUpdates(): Promise<UpdateItem[]> {
  try {
    return await readUpdates(await getCache());
  } catch {
    return [];
  }
}

function MapCard() {
  return (
    <article className="card">
      <h2>Mapa do Paraná</h2>
      <p className="muted">Clique em um município para ver os resultados locais.</p>
      <PrMap />
    </article>
  );
}

export default async function Home() {
  const [results, updates] = await Promise.all([loadHomeResults(), loadUpdates()]);
  const live = liveEmbed();
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
          <MapCard />
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
      content: <MapCard />
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
            <LiveCoverage embed={live} />
            <UpdatesCard items={updates} />
            <article className="card">
              <h2>Buscar município</h2>
              <MunicipalitySearch />
            </article>
            <TvMode embed={live} />
          </aside>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
