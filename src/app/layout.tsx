import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PR+ Eleições 2026",
  description: "Apuração das Eleições 2026 no PR+"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
