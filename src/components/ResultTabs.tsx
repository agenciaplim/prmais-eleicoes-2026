"use client";

import { useEffect, useState, type ReactNode } from "react";

export type TabPanel = { id: string; label: string; content: ReactNode };

// Panels are server-rendered; this only switches visibility and keeps the choice in the URL hash.
export function ResultTabs({ panels }: { panels: TabPanel[] }) {
  const [active, setActive] = useState(panels[0]!.id);

  useEffect(() => {
    const fromHash = () => {
      const id = window.location.hash.slice(1);
      if (panels.some((panel) => panel.id === id)) setActive(id);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [panels]);

  function select(id: string) {
    setActive(id);
    history.replaceState(null, "", `#${id}`);
  }

  return (
    <>
      <div className="tabs" role="tablist" aria-label="Resultados">
        {panels.map((panel) => (
          <button
            key={panel.id}
            id={`tab-${panel.id}`}
            role="tab"
            aria-selected={active === panel.id}
            aria-controls={`panel-${panel.id}`}
            onClick={() => select(panel.id)}
          >
            {panel.label}
          </button>
        ))}
      </div>
      {panels.map((panel) => (
        <div
          key={panel.id}
          id={`panel-${panel.id}`}
          role="tabpanel"
          aria-labelledby={`tab-${panel.id}`}
          hidden={active !== panel.id}
        >
          {panel.content}
        </div>
      ))}
    </>
  );
}
