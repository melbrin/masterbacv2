import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Simulateur BAC 2026 — Teste ton niveau | MasterBac",
  description:
    "Simulateur BAC gratuit, sans inscription. 155 questions de maths calibrées par difficulté. Découvre ta note estimée et tes lacunes chapitre par chapitre.",
  keywords: "BAC 2026, simulateur, maths, révisions, quiz, note BAC",
  openGraph: {
    title: "Quel est ton niveau BAC ? — MasterBac",
    description:
      "Teste-toi en 10 à 40 questions et découvre ta note estimée au BAC de maths.",
    type: "website",
    url: "https://masterbac.com/test",
    siteName: "MasterBac",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#06060c" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
