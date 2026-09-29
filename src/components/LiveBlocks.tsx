import type { LiveEmbed } from "@/lib/live";

function Player({ embed, title }: { embed: NonNullable<LiveEmbed>; title: string }) {
  return (
    <div className="video">
      <iframe
        src={embed.src}
        title={title}
        loading="lazy"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    </div>
  );
}

function Soon() {
  return <div className="placeholder video-placeholder">Transmissão em breve</div>;
}

export function LiveCoverage({ embed }: { embed: LiveEmbed }) {
  return (
    <article className="card card--live">
      <header className="card-head">
        <h2>Cobertura ao vivo</h2>
        {embed && <span className="on-air"><span className="live-dot" aria-hidden="true" />Ao vivo</span>}
      </header>
      {embed ? <Player embed={embed} title="Transmissão da apuração — PR Mais Eleições 2026" /> : <Soon />}
      {embed && <a className="more-link" href={embed.watchUrl} target="_blank" rel="noopener noreferrer">Assistir no YouTube</a>}
    </article>
  );
}

export function TvMode({ embed }: { embed: LiveEmbed }) {
  return (
    <article className="card card--tv">
      <h2>Modo TV / OBS</h2>
      <p className="muted">Visualização para telão e transmissão, formato 16:9.</p>
      {embed ? <Player embed={embed} title="Modo TV — PR Mais Eleições 2026" /> : <Soon />}
    </article>
  );
}
