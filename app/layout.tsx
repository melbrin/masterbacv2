import type { Metadata, Viewport } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import ThemeToggle from "@/components/ThemeToggle";
import ScriptTheme from "@/components/socle/ScriptTheme";
import "./globals.css";

// Polices téléchargées à la fabrication et servies par l'application : aucun appel à un tiers.
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--police-sans", display: "swap" });
const jetBrainsMono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--police-mono", display: "swap" });

export const metadata: Metadata = {
  title: "Test de niveau BAC 2027 | MasterBac",
  description:
    "Test de niveau gratuit, sans inscription. Questions calibrées par difficulté. Ta note estimée et tes lacunes, chapitre par chapitre.",
  keywords: "BAC 2027, test de niveau, maths, physique-chimie, révisions, quiz",
  openGraph: {
    title: "Quel est ton niveau pour le BAC ? | MasterBac",
    description: "Teste-toi en 10 à 40 questions et vois ta note estimée, en maths ou en physique-chimie.",
    type: "website",
    url: "https://app.masterbac.fr",
    siteName: "MasterBac",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#06060c",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${dmSans.variable} ${jetBrainsMono.variable}`} suppressHydrationWarning>
      <head>
        <ScriptTheme />
      </head>
      <body className="antialiased">
        <ThemeToggle />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
