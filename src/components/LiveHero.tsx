"use client";

import { useEffect, useState } from "react";
import { buildHeroStatus, parseHeroResult, type HeroStatus } from "@/lib/ui/hero-status";

const POLL_INTERVAL_MS = 30_000;
const REQUEST_TIMEOUT_MS = 10_000;

export function LiveHero({ initial }: { initial: HeroStatus }) {
  const [status, setStatus] = useState(initial);

  useEffect(() => {
    let active = true;

    async function refresh() {
      if (document.visibilityState !== "visible") return;
      try {
        const response = await fetch("/api/results", { cache: "no-store", signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
        if (!response.ok) return; // keep the last valid state on 503/5xx
        const result = parseHeroResult(await response.json());
        if (!result || !active) return;
        const source = response.headers.has("X-Result-Stored-At") ? "cache" : "mock";
        setStatus(buildHeroStatus(source, result));
      } catch {
        // Network failure: keep showing the last valid state.
      }
    }

    const timer = setInterval(refresh, POLL_INTERVAL_MS);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-title">
        <h1 id="hero-title">Eleições 2026</h1>
        <p>Acompanhe em tempo real os resultados em todo o Brasil.</p>
      </div>
      <div className={`live-badge live-badge--${status.state}`} role="status">
        {status.state === "live" && <span className="live-dot" aria-hidden="true" />}
        {status.badge}
      </div>
      <div className="hero-meta" aria-live="polite">
        {status.updatedText && <p>{status.updatedText}</p>}
        {status.progressText && <p className="hero-progress">{status.progressText}</p>}
        {status.note && <small>{status.note}</small>}
      </div>
    </section>
  );
}
