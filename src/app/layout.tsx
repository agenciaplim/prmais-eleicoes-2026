import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PR+ Eleições 2026",
  description: "Apuração das Eleições 2026 no PR+"
};

export const viewport: Viewport = {
  themeColor: "#013FA2"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
