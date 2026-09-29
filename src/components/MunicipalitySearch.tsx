"use client";

import { useEffect, useId, useState } from "react";
import { formatPercent } from "@/lib/ui/format";
import {
  FEATURED_MUNICIPALITIES,
  filterMunicipalities,
  parseLocationOptions,
  parseMunicipalDetail,
  type MunicipalDetail,
  type MunicipalityOption
} from "@/lib/ui/municipality-search";

const TIMEOUT_MS = 10_000;

export async function getJson(url: string): Promise<unknown | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

type Selection = { option: MunicipalityOption; president: MunicipalDetail | null; governor: MunicipalDetail | null; loading: boolean };

export function OfficeResult({ title, detail }: { title: string; detail: MunicipalDetail | null }) {
  return (
    <div className="muni-office">
      <h4>{title}</h4>
      {!detail || detail.candidates.length === 0 ? (
        <p className="muted">Resultados ainda não disponíveis.</p>
      ) : (
        <>
          <p className="muted">{formatPercent(detail.progress)} das seções apuradas</p>
          <ol className="rows">
            {detail.candidates.slice(0, 3).map((candidate, index) => (
              <li key={candidate.number} className="row row--compact">
                <span className={index === 0 ? "rank rank-lead" : "rank"}>{index + 1}</span>
                <div className="row-main">
                  <span className="row-name">{candidate.name} <small className="muted">{candidate.party}</small></span>
                  <div className="bar"><span style={{ width: `${candidate.percentage}%` }} /></div>
                </div>
                <div className="row-value"><strong>{formatPercent(candidate.percentage)}</strong></div>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}

export function MunicipalitySearch() {
  const listId = useId();
  const [options, setOptions] = useState<MunicipalityOption[]>([]);
  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState<Selection | null>(null);

  useEffect(() => {
    getJson("/api/locations?state=pr").then((data) => setOptions(parseLocationOptions(data)));
  }, []);

  const suggestions = filterMunicipalities(options, query);
  const featured = FEATURED_MUNICIPALITIES.flatMap((name) => options.filter((option) => option.name === name));

  async function select(option: MunicipalityOption) {
    setQuery("");
    setSelection({ option, president: null, governor: null, loading: true });
    const [president, governor] = await Promise.all([
      getJson(`/api/municipalities?office=president&code=${option.tseCode}`),
      getJson(`/api/municipalities?office=governor&code=${option.tseCode}`)
    ]);
    setSelection((current) =>
      current?.option.tseCode === option.tseCode
        ? { option, president: parseMunicipalDetail(president), governor: parseMunicipalDetail(governor), loading: false }
        : current
    );
  }

  return (
    <div className="muni-search">
      <div className="combo">
        <input
          type="search"
          role="combobox"
          aria-expanded={suggestions.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label="Buscar município do Paraná"
          placeholder={options.length ? "Digite o nome do município..." : "Carregando municípios..."}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && suggestions[0]) select(suggestions[0]);
            if (event.key === "Escape") setQuery("");
          }}
        />
        {suggestions.length > 0 && (
          <ul id={listId} role="listbox" className="suggestions">
            {suggestions.map((option) => (
              <li key={option.tseCode} role="option" aria-selected={false}>
                <button type="button" onClick={() => select(option)}>{option.name}</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {featured.length > 0 && (
        <div className="chips" aria-label="Mais acessados">
          <span className="muted">Mais acessados:</span>
          {featured.map((option) => (
            <button key={option.tseCode} type="button" className="chip" onClick={() => select(option)}>{option.name}</button>
          ))}
        </div>
      )}

      {selection && (
        <section className="muni-result" aria-live="polite">
          <h3>{selection.option.name}</h3>
          {selection.loading ? (
            <p className="muted">Carregando resultados...</p>
          ) : (
            <>
              <OfficeResult title="Presidente" detail={selection.president} />
              <OfficeResult title="Governador" detail={selection.governor} />
            </>
          )}
        </section>
      )}
    </div>
  );
}
