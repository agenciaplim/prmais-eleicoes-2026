"use client";

import { useEffect, useState } from "react";
import { getJson, OfficeResult } from "@/components/MunicipalitySearch";
import { formatPercent } from "@/lib/ui/format";
import { colorMunicipalities, NO_DATA_COLOR, parseOverview, type OverviewItem } from "@/lib/ui/map-colors";
import { parseMunicipalDetail, type MunicipalDetail } from "@/lib/ui/municipality-search";

type Geometry = { viewBox: string; features: { ibge: string; name: string; d: string }[] };
type Office = "president" | "governor";

const REFRESH_MS = 60_000;
let geometryPromise: Promise<Geometry | null> | null = null;

// Static file in /public, shared by every map instance on the page.
function loadGeometry() {
  geometryPromise ??= getJson("/maps/pr-municipios.json").then((data) => {
    const geometry = data as Geometry | null;
    return geometry && typeof geometry.viewBox === "string" && Array.isArray(geometry.features) ? geometry : null;
  });
  return geometryPromise;
}

export function PrMap() {
  const [geometry, setGeometry] = useState<Geometry | null>(null);
  const [office, setOffice] = useState<Office>("president");
  const [items, setItems] = useState<OverviewItem[] | null>(null);
  const [hover, setHover] = useState<OverviewItem | { name: string } | null>(null);
  const [selected, setSelected] = useState<{ name: string; detail: MunicipalDetail | null; loading: boolean } | null>(null);

  useEffect(() => {
    loadGeometry().then(setGeometry);
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (document.visibilityState !== "visible") return;
      const parsed = parseOverview(await getJson(`/api/municipalities?office=${office}`));
      if (active && parsed) setItems(parsed); // keep the last valid overview on failure
    };
    setItems(null);
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [office]);

  const coloring = colorMunicipalities(items ?? []);

  async function select(name: string, ibge: string) {
    const entry = coloring.byIbge.get(ibge)?.item;
    setSelected({ name, detail: null, loading: Boolean(entry) });
    if (!entry) return;
    const detail = parseMunicipalDetail(await getJson(`/api/municipalities?office=${office}&code=${entry.tseCode}`));
    setSelected((current) => (current?.name === name ? { name, detail, loading: false } : current));
  }

  return (
    <div className="pr-map">
      <div className="map-toolbar">
        <label>
          Cargo{" "}
          <select value={office} onChange={(event) => { setOffice(event.target.value as Office); setSelected(null); }}>
            <option value="president">Presidente</option>
            <option value="governor">Governador</option>
          </select>
        </label>
        <p className="map-hover" aria-live="polite">
          {hover
            ? "leader" in hover && hover.leader
              ? `${hover.name}: ${hover.leader.name} (${hover.leader.party}) ${formatPercent(hover.leader.percentage)}`
              : `${hover.name}: sem dados`
            : "Passe o mouse ou toque em um município."}
        </p>
      </div>

      <div className="map-body">
        <div className="map-canvas">
          {geometry ? (
            <svg viewBox={geometry.viewBox} role="img" aria-label="Mapa dos municípios do Paraná colorido pelo candidato mais votado">
              {geometry.features.map((feature) => {
                const entry = coloring.byIbge.get(feature.ibge);
                return (
                  <path
                    key={feature.ibge}
                    d={feature.d}
                    fill={entry?.color ?? NO_DATA_COLOR}
                    className={selected?.name === feature.name ? "is-selected" : undefined}
                    onMouseEnter={() => setHover(entry?.item ?? { name: feature.name })}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => select(feature.name, feature.ibge)}
                  >
                    <title>{feature.name}</title>
                  </path>
                );
              })}
            </svg>
          ) : (
            <div className="placeholder">Carregando mapa...</div>
          )}
        </div>

        <aside className="map-side">
          <ul className="legend">
            {coloring.legend.map((item) => (
              <li key={item.label}><span style={{ background: item.color }} aria-hidden="true" />{item.label}</li>
            ))}
          </ul>
          {items?.length === 0 && <p className="muted">Resultados por município ainda não disponíveis.</p>}
          {selected && (
            <div className="map-detail" aria-live="polite">
              <h3>{selected.name}</h3>
              {selected.loading ? (
                <p className="muted">Carregando resultados...</p>
              ) : (
                <OfficeResult title={office === "president" ? "Presidente" : "Governador"} detail={selected.detail} />
              )}
            </div>
          )}
        </aside>
      </div>
      <p className="map-source">Malha municipal: IBGE.</p>
    </div>
  );
}
