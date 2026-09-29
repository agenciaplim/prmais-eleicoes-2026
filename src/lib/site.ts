// Links to the PR Mais portal (source: prmais.com, 2026-09-28).
export const PORTAL_URL = "https://prmais.com";
export const PORTAL_SEARCH_URL = `${PORTAL_URL}/`;
export const SLOGAN = "O Paraná em tempo real";

export const portalMenu = [
  { label: "Home", href: `${PORTAL_URL}/` },
  { label: "Plantão PR Mais", href: `${PORTAL_URL}/category/policial/` },
  { label: "Agenda Pública", href: `${PORTAL_URL}/category/politica/` },
  { label: "Cidadania", href: `${PORTAL_URL}/category/cidadania/` },
  { label: "Educação", href: `${PORTAL_URL}/category/educacao/` },
  { label: "Economia", href: `${PORTAL_URL}/category/economia/` },
  { label: "Na cancha", href: `${PORTAL_URL}/category/esportes/` },
  { label: "Palco Cultural", href: `${PORTAL_URL}/category/palco-cultural/` },
  { label: "Partiu!", href: `${PORTAL_URL}/category/lazer-e-turismo/` }
] as const;

export const socialLinks = [
  { label: "Facebook", href: "https://www.facebook.com/people/Portal-PRMais/61589884520936/" },
  { label: "Instagram", href: "https://www.instagram.com/_prmais/" },
  { label: "X", href: "https://x.com/Portal_PRMais" },
  { label: "WhatsApp", href: "https://whatsapp.com/channel/0029Vb8epdXAe5VuaRKnVz2q" },
  { label: "TikTok", href: "https://www.tiktok.com/@_prmais" }
] as const;
