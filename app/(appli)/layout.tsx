import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "katex/dist/katex.min.css";
import "./charte.css";
import "./complements.css";
import "./jeux.css";
import "./simulations.css";
import "./labo.css";
import "./memoire.css";
import "./tp.css";
import "./entrainement.css";
import "./python.css";
import { attributTheme, COOKIE_THEME, lisChoixTheme } from "@/lib/commun/theme";
import "./accueil.css";

export const metadata: Metadata = {
  title: { default: "MasterBac", template: "%s · MasterBac" },
  description: "MasterBac prépare chaque DS de physique-chimie, puis le bac.",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default async function Racine({ children }: { children: React.ReactNode }) {
  // le thème choisi par l'élève (bouton soleil ou lune) ; sans choix, la page suit le réglage du téléphone
  const theme = attributTheme(lisChoixTheme((await cookies()).get(COOKIE_THEME)?.value));
  return (
    <html lang="fr" data-theme={theme}>
      <body>{children}</body>
    </html>
  );
}
