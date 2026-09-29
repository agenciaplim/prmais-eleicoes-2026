import { BrandLogo } from "@/components/BrandLogo";
import { PORTAL_SEARCH_URL, PORTAL_URL, portalMenu, SLOGAN } from "@/lib/site";

function SearchForm({ className }: { className?: string }) {
  return (
    <form className={className} action={PORTAL_SEARCH_URL} method="get" role="search">
      <input type="search" name="s" aria-label="Buscar notícias no PR Mais" placeholder="Buscar notícias..." />
    </form>
  );
}

export function SiteHeader() {
  const links = portalMenu.map((item) => <a key={item.href} href={item.href}>{item.label}</a>);

  return (
    <header className="header">
      <div className="shell header-inner">
        <details className="menu-mobile">
          <summary aria-label="Abrir menu">☰</summary>
          <nav aria-label="Seções do PR Mais">
            <SearchForm />
            {links}
          </nav>
        </details>

        <a className="brand" href={PORTAL_URL} aria-label="PR Mais — ir para o portal">
          <BrandLogo height={36} priority />
          <span className="slogan">{SLOGAN}</span>
        </a>

        <SearchForm className="search" />
      </div>
      <div className="menu-bar">
        <nav className="shell menu" aria-label="Seções do PR Mais">{links}</nav>
      </div>
    </header>
  );
}
