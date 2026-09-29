import { BrandLogo } from "@/components/BrandLogo";
import { SLOGAN, socialLinks } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="shell footer-inner">
        <div className="footer-brand">
          <BrandLogo variant="bege" height={28} />
          <span>{SLOGAN}</span>
        </div>
        <nav className="social" aria-label="PR Mais nas redes sociais">
          {socialLinks.map((item) => (
            <a key={item.href} href={item.href} target="_blank" rel="noopener noreferrer">{item.label}</a>
          ))}
        </nav>
        <span>Fonte: TSE · Dados oficiais verificados</span>
      </div>
    </footer>
  );
}
