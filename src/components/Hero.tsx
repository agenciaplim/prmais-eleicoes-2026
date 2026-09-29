import type { HeroStatus } from "@/lib/ui/hero-status";

export function Hero({ status }: { status: HeroStatus }) {
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
