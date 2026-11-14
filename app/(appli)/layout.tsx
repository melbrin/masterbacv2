import type { Metadata, Viewport } from "next";
import "katex/dist/katex.min.css";
import "./charte.css";
import "./complements.css";
import "./jeux.css";
import "./simulations.css";

export const metadata: Metadata = {
  title: { default: "MasterBac", template: "%s · MasterBac" },
  description: "MasterBac prépare chaque DS de physique-chimie, puis le bac.",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function Racine({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
